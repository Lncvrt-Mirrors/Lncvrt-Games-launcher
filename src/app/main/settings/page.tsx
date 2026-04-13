'use client'

import { Setting } from '@/components/Setting'
import { useGlobal } from '@/providers/GlobalProvider'
import { copyToClipboard } from '@/lib/clipboard'
import { platform } from '@tauri-apps/plugin-os'
import Dropdown from '@/components/Dropdown'

export default function Settings () {
  const {
    settings,
    version,
    notificationsAllowed,
    sidebarAlwaysShowGames,
    linuxUseWine,
    linuxWineCommand,
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
          label='Use wine if needed'
          value={linuxUseWine}
          onChange={async () => {
            await settings?.set('linuxUseWine', !linuxUseWine)
          }}
          className={platform() == 'linux' ? '' : 'hidden'}
        />
        <p hidden={!(platform() == 'linux' && linuxUseWine)}>Wine Command:</p>
        <input
          type='text'
          value={linuxWineCommand}
          onChange={async e =>
            await settings?.set('linuxWineCommand', e.target.value)
          }
          className='input-field my-1'
          hidden={!(platform() == 'linux' && linuxUseWine)}
        ></input>
        <div className='flex flex-row gap-2 items-center'>
          <p
            title='The theme you want the launcher to use.'
            className='text-lg'
          >
            Theme:
          </p>
          <Dropdown
            value={theme}
            options={[
              { label: 'Dark', value: 'dark' },
              { label: 'Red', value: 'red' },
              { label: 'Blue', value: 'blue' },
              { label: 'Purple', value: 'purple' }
            ]}
            onChange={async val => {
              await settings?.set('theme', val)
            }}
          />
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
