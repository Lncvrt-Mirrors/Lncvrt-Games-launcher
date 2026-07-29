'use client'

import { verifySignature } from '@/lib/util'
import { useGlobal } from '@/providers/GlobalProvider'
import { app } from '@tauri-apps/api'
import { message } from '@tauri-apps/plugin-dialog'
import { fetch } from '@tauri-apps/plugin-http'
import { openUrl } from '@tauri-apps/plugin-opener'
import { arch, platform } from '@tauri-apps/plugin-os'
import { Dispatch, SetStateAction, useState } from 'react'

function AccountLoggedOut () {
  const { account, setServerVersionList } = useGlobal()
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  return (
    <>
      <p className='text-3xl ml-4 mt-4'>Account Login</p>
      <div className='ml-4 mt-4 bg-(--col1) border border-(--col3) rounded-lg p-4 w-fit h-fit'>
        <form
          className='flex flex-col gap-2'
          onSubmit={async e => {
            e.preventDefault()

            const response = await fetch(
              'https://games.lncvrt.xyz/api/account/login',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  username,
                  password
                })
              }
            )
            const signature = response.headers.get('x-signature') ?? ''
            const data = await response.json()
            if (
              response.status != 200 ||
              !(await verifySignature(JSON.stringify(data), signature))
            ) {
              await message(
                "Failed to login, there was an issue validating the data wasn't tampered with.",
                { title: 'Request tampered', kind: 'error' }
              )
              return
            }
            if (data.success) {
              const response2 = await fetch(
                'https://games.lncvrt.xyz/api/launcher/versions',
                {
                  headers: {
                    Requester: 'LncvrtGamesLauncherClient',
                    ClientVersion: await app.getVersion(),
                    ClientPlatform: platform() + '-' + arch(),
                    Authorization: data.data.session
                  }
                }
              )
              const signature2 = response2.headers.get('x-signature') ?? ''
              const data2 = await response2.json()
              if (
                response2.status == 200 &&
                (await verifySignature(JSON.stringify(data2), signature2))
              ) {
                setServerVersionList(data2)
              }

              await account?.set('session', data.data.session)
              await account?.set('name', data.data.username)
              await account?.set('id', data.data.id)
              await account?.set('admin', data.data.admin)
            } else {
              await message(data.message || 'n/a', {
                title: 'Failed to login',
                kind: 'error'
              })
            }
          }}
        >
          <input
            id='username'
            name='username'
            placeholder='Username'
            type='username'
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            className='input-field btntheme1'
          />
          <input
            id='password'
            name='password'
            placeholder='Password'
            type='password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className='input-field btntheme1'
          />
          <button type='submit' className='button btntheme1'>
            Login
          </button>
          <div className='flex justify-center flex-col gap-2 mt-6 text-center'>
            <button
              type='button'
              onClick={async () =>
                await openUrl(
                  'https://games.lncvrt.xyz/account/forgot-username'
                )
              }
              className='button btntheme1'
            >
              Forgot username?
            </button>
            <button
              type='button'
              onClick={async () =>
                await openUrl(
                  'https://games.lncvrt.xyz/account/forgot-password'
                )
              }
              className='button btntheme1'
            >
              Forgot password?
            </button>
            <button
              type='button'
              onClick={async () =>
                await openUrl('https://games.lncvrt.xyz/account/register')
              }
              className='button btntheme1'
            >
              Don&apos;t have an account?
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function AccountChangeUsername ({
  setChangingUsername
}: {
  setChangingUsername: Dispatch<SetStateAction<boolean>>
}) {
  const { account, accountSession } = useGlobal()

  const [newUsername, setNewUsername] = useState<string>('')

  return (
    <>
      <p className='text-3xl ml-4 mt-4'>Change Account Username</p>
      <div className='ml-4 mt-4 bg-(--col1) border border-(--col3) rounded-lg p-4 w-fit h-fit'>
        <form
          className='flex flex-col gap-2'
          onSubmit={async e => {
            e.preventDefault()

            const response = await fetch(
              'https://games.lncvrt.xyz/api/account/change-username',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  authorization: accountSession ?? ''
                },
                body: JSON.stringify({
                  newUsername
                })
              }
            )
            const signature = response.headers.get('x-signature') ?? ''
            const data = await response.json()
            if (
              response.status != 200 ||
              !(await verifySignature(JSON.stringify(data), signature))
            ) {
              await message(
                "Failed to change username, there was an issue validating the data wasn't tampered with.",
                { title: 'Request tampered', kind: 'error' }
              )
              return
            }
            if (data.success) {
              await account?.set('session', data.data)
              await account?.set('name', newUsername)
              setChangingUsername(false)
            } else {
              await message(data.message || 'n/a', {
                title: 'Failed to change username',
                kind: 'error'
              })
            }
          }}
        >
          <input
            id='new-username'
            name='new-username'
            placeholder='New username'
            type='username'
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            required
            className='input-field btntheme1'
          />
          <button type='submit' className='button btntheme1'>
            Change Username
          </button>
          <button
            type='button'
            className='button btntheme1'
            onClick={() => setChangingUsername(false)}
          >
            Back
          </button>
        </form>
      </div>
    </>
  )
}

function AccountChangePassword ({
  setChangingPassword
}: {
  setChangingPassword: Dispatch<SetStateAction<boolean>>
}) {
  const { account, accountSession, setServerVersionList } = useGlobal()

  const [newPassword, setNewPassword] = useState<string>('')
  const [retypeNewPassword, setRetypeNewPassword] = useState<string>('')

  return (
    <>
      <p className='text-3xl ml-4 mt-4'>Change Account Password</p>
      <div className='ml-4 mt-4 bg-(--col1) border border-(--col3) rounded-lg p-4 w-fit h-fit'>
        <form
          className='flex flex-col gap-2'
          onSubmit={async e => {
            e.preventDefault()

            if (newPassword !== retypeNewPassword) {
              await message('Passwords must match', {
                title: "Passwords don't match!",
                kind: 'error'
              })
              return
            }

            const response = await fetch(
              'https://games.lncvrt.xyz/api/account/change-password',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  authorization: accountSession ?? ''
                },
                body: JSON.stringify({
                  newPassword
                })
              }
            )
            const signature = response.headers.get('x-signature') ?? ''
            const data = await response.json()
            if (
              response.status != 200 ||
              !(await verifySignature(JSON.stringify(data), signature))
            ) {
              await message(
                "Failed to change password, there was an issue validating the data wasn't tampered with.",
                { title: 'Request tampered', kind: 'error' }
              )
              return
            }
            if (data.success) {
              const response2 = await fetch(
                'https://games.lncvrt.xyz/api/launcher/versions',
                {
                  headers: {
                    Requester: 'LncvrtGamesLauncherClient',
                    ClientVersion: await app.getVersion(),
                    ClientPlatform: platform() + '-' + arch(),
                    Authorization: data.data
                  }
                }
              )
              const signature2 = response2.headers.get('x-signature') ?? ''
              const data2 = await response2.json()
              if (
                response2.status == 200 &&
                (await verifySignature(JSON.stringify(data2), signature2))
              ) {
                setServerVersionList(data2)
              }

              await account?.set('session', data.data)
              setChangingPassword(false)
            } else {
              await message(data.message || 'n/a', {
                title: 'Failed to change password',
                kind: 'error'
              })
            }
          }}
        >
          <input
            id='new-password'
            name='new-password'
            placeholder='New password'
            type='password'
            autoComplete='new-password'
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            className='input-field btntheme1'
          />
          <input
            id='retype-new-password'
            name='retype-new-password'
            placeholder='Re-type password'
            type='password'
            autoComplete='new-password'
            value={retypeNewPassword}
            onChange={e => setRetypeNewPassword(e.target.value)}
            required
            className='input-field btntheme1'
          />
          <button type='submit' className='button btntheme1'>
            Change Password
          </button>
          <button
            type='button'
            className='button btntheme1'
            onClick={() => setChangingPassword(false)}
          >
            Back
          </button>
        </form>
      </div>
    </>
  )
}

function AccountLoggedIn () {
  const { account, accountName, setServerVersionList } = useGlobal()
  const [changingUsername, setChangingUsername] = useState<boolean>(false)
  const [changingPassword, setChangingPassword] = useState<boolean>(false)

  if (changingUsername)
    return <AccountChangeUsername setChangingUsername={setChangingUsername} />

  if (changingPassword)
    return <AccountChangePassword setChangingPassword={setChangingPassword} />

  return (
    <>
      <p className='text-3xl ml-4 mt-4'>Account</p>
      <div className='ml-4 mt-4 bg-(--col1) border border-(--col3) rounded-lg p-4 w-fit h-fit'>
        <p>Logged in as: {accountName}</p>
        <div className='flex justify-center flex-col gap-2 mt-4 text-center'>
          <button
            onClick={() => setChangingUsername(true)}
            className='button btntheme1'
          >
            Change username
          </button>
          <button
            onClick={() => setChangingPassword(true)}
            className='button btntheme1'
          >
            Change password
          </button>
          <button
            onClick={async () => {
              const response = await fetch(
                'https://games.lncvrt.xyz/api/launcher/versions',
                {
                  headers: {
                    Requester: 'LncvrtGamesLauncherClient',
                    ClientVersion: await app.getVersion(),
                    ClientPlatform: platform() + '-' + arch(),
                    Authorization: ''
                  }
                }
              )
              const signature = response.headers.get('x-signature') ?? ''
              const data = await response.json()
              if (
                response.status == 200 &&
                (await verifySignature(JSON.stringify(data), signature))
              ) {
                setServerVersionList(data)
              }

              await account?.clear()
            }}
            className='button btntheme1'
          >
            Logout
          </button>
        </div>
      </div>
    </>
  )
}

export default function AccountsPage () {
  const { accountSession, accountId, accountName } = useGlobal()

  if (!accountSession || !accountId || !accountName) return <AccountLoggedOut />
  else return <AccountLoggedIn />
}
