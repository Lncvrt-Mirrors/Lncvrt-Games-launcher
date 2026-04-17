'use client'

import { Setting } from '@/components/Setting'
import { useGlobal } from '@/providers/GlobalProvider'
import { copyToClipboard } from '@/lib/clipboard'
import { platform } from '@tauri-apps/plugin-os'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'

export default function Settings () {
  const {
    settings,
    version,
    notificationsAllowed,
    sidebarAlwaysShowGames,
    linuxUseWine,
    linuxWineCommand,
    customDataLocation,
    downloadProgress,
    setMovingData
  } = useGlobal()

  return (
    <>
      <p className='text-3xl ml-4 mt-4'>Settings</p>
      <div className='ml-4 mt-4 bg-(--col1)/50 border border-(--col3)/50 rounded-lg p-4 w-fit h-fit'>
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
        <Setting
          label='Use custom data location'
          value={!!customDataLocation}
          disabled={downloadProgress.length > 0}
          onChange={async () => {
            if (customDataLocation) {
              try {
                setMovingData(true)
                await invoke('move_game_data', { destination: '' })
                await settings?.set('customDataLocation', '')
                await settings?.save()
                await invoke('restart_app')
              } catch {
                setMovingData(false)
              }
            } else {
              const selected = await open({
                directory: true,
                title: 'Select data location'
              })
              if (!selected || typeof selected !== 'string') return
              try {
                setMovingData(true)
                await invoke('move_game_data', { destination: selected })
                await settings?.set('customDataLocation', selected)
                await settings?.save()
                await invoke('restart_app')
              } catch {
                setMovingData(false)
              }
            }
          }}
          title='Move game data to a custom folder location. Disabled during downloads.'
        />
        {customDataLocation && (
          <p className='text-sm opacity-50 ml-6 -mt-1 mb-2'>
            {customDataLocation}
          </p>
        )}
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
