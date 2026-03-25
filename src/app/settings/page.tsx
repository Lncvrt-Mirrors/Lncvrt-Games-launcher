'use client'

import { Setting } from '@/componets/Setting'
import { useGlobal } from '@/app/GlobalProvider'
import { copyToClipboard } from '@/lib/Clipboard'
import { platform } from '@tauri-apps/plugin-os'

export default function Settings () {
  const {
    settings,
    version,
    notificationsAllowed,
    sidebarAlwaysShowGames,
    unixUseWine,
    unixWineCommand,
    theme
  } = useGlobal()

  return (
    <>
      <p className='text-3xl ml-4 mt-4'>Settings</p>
      <div className='ml-4 mt-4 bg-(--col1) border border-(--col3) rounded-lg p-4 w-fit h-fit'>
        <Setting
          label='Allow sending notifications'
          value={notificationsAllowed}
          onChange={async () => {
            await settings?.set('notificationsAllowed', !notificationsAllowed)
          }}
          title='This setting does as you expect, allow the launcher to send notifications for when stuff like downloading is done.'
        />
        <Setting
          label='Always show games in sidebar'
          value={sidebarAlwaysShowGames}
          onChange={async () => {
            await settings?.set(
              'sidebarAlwaysShowGames',
              !sidebarAlwaysShowGames
            )
          }}
          title="This setting will make it so when you are on a page like this, the games won't disappear."
        />
        <Setting
          label='Use wine when needed to launch games'
          value={unixUseWine}
          onChange={async () => {
            await settings?.set('unixUseWine', !unixUseWine)
          }}
          className={platform() == 'linux' ? '' : 'hidden'}
        />
        <p hidden={!(platform() == 'linux' && unixUseWine)}>Wine Command:</p>
        <input
          type='text'
          value={unixWineCommand}
          onChange={async e => {
            await settings?.set('unixUseWine', e.target.value)
          }}
          className={`input-field my-1 ${
            platform() == 'linux' && unixUseWine ? '' : 'hidden'
          }`}
        ></input>
        <div title='The theme you want the launcher to use.'>
          <label className='text-lg'>Theme:</label>
          <select
            className='ml-2 bg-(--col2) border border-(--col4) rounded-md'
            value={theme}
            onChange={async e => {
              await settings?.set('theme', e.target.value)
            }}
          >
            <option value={'dark'}>Dark (default)</option>
            <option value={'red'}>Red</option>
            <option value={'blue'}>Blue</option>
            <option value={'purple'}>Purple</option>
          </select>
        </div>
      </div>
      <p
        className='fixed bottom-1.5 right-1.5 rounded-md cursor-pointer px-1 border z-100 transition-colors btntheme1'
        onClick={async () =>
          await copyToClipboard(`v${version}`, notificationsAllowed)
        }
        title='The current launcher version.'
      >
        v{version}
      </p>
    </>
  )
}
