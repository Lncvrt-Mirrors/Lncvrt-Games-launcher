'use client'

import { Setting } from '@/components/Setting'
import { useGlobal } from '@/providers/GlobalProvider'
import { copyToClipboard } from '@/lib/clipboard'
import { platform } from '@tauri-apps/plugin-os'
import { message, open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import Dropdown from '@/components/Dropdown'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { relaunch } from '@tauri-apps/plugin-process'
import { BaseDirectory, exists, readDir, remove } from '@tauri-apps/plugin-fs'
import { openPath } from '@tauri-apps/plugin-opener'
import { appLocalDataDir } from '@tauri-apps/api/path'

export default function SettingsPage () {
  const {
    settings,
    versions,
    account,
    version,
    versionsList,
    sidebarAlwaysShowGames,
    linuxUseWine,
    linuxWineCommand,
    theme,
    customDataLocation,
    downloadProgress,
    setMovingData
  } = useGlobal()

  return (
    <>
      <p className='text-3xl ml-4 mt-4'>Settings</p>
      <div className='flex flex-row p-4 gap-4'>
        <div className='bg-(--col1) border border-(--col3) rounded-lg p-4 w-fit h-fit'>
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
          {platform() == 'linux' && linuxUseWine && (
            <>
              <p>Wine Command:</p>
              <input
                type='text'
                value={linuxWineCommand}
                onChange={async e =>
                  await settings?.set('linuxWineCommand', e.target.value)
                }
                className='input-field my-1'
              ></input>
            </>
          )}
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
                  await invoke('restart_app')
                } catch {
                  setMovingData(false)
                }
              }
            }}
            title='Move game data to a custom storage location, like a different disk.'
          />
          {customDataLocation && (
            <p className='text-sm opacity-50 ml-6 -mt-1 mb-2'>
              {customDataLocation}
            </p>
          )}
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

                const window = await WebviewWindow.getByLabel(
                  'berrydashleaderboards'
                )
                if (window) {
                  await window.close()

                  new WebviewWindow('berrydashleaderboards', {
                    title: 'Berry Dash Leaderboards',
                    url:
                      'https://games.lncvrt.xyz/game/berry-dash/leaderboards?launcher=1&theme=' +
                      val,
                    width: 800,
                    height: 600,
                    resizable: false,
                    maximizable: false
                  })
                }
              }}
            />
          </div>
        </div>
        <div className='bg-(--col1) border border-(--col3) rounded-lg p-4 w-fit h-fit flex flex-col gap-2'>
          <button
            className='button btntheme1'
            title="Restarts the launcher. I don't think I needed to add this description."
            onClick={async () => await relaunch()}
          >
            Restart launcher
          </button>
          <button
            className='button btntheme1'
            title='Completely reset the launcher, delete games, logout of account & reset settings.'
            onClick={async () => {
              if (
                await exists(
                  (customDataLocation ? customDataLocation + '/' : null) +
                    'game',
                  {
                    baseDir: customDataLocation
                      ? undefined
                      : BaseDirectory.AppLocalData
                  }
                )
              )
                await remove(
                  (customDataLocation ? customDataLocation + '/' : null) +
                    'game',
                  {
                    baseDir: customDataLocation
                      ? undefined
                      : BaseDirectory.AppLocalData,
                    recursive: true
                  }
                )

              if (
                await exists(
                  (customDataLocation ? customDataLocation + '/' : null) +
                    'downloads',
                  {
                    baseDir: customDataLocation
                      ? undefined
                      : BaseDirectory.AppLocalData
                  }
                )
              )
                await remove(
                  (customDataLocation ? customDataLocation + '/' : null) +
                    'downloads',
                  {
                    baseDir: customDataLocation
                      ? undefined
                      : BaseDirectory.AppLocalData,
                    recursive: true
                  }
                )

              await settings?.clear()
              await versions?.clear()
              await account?.clear()
              await relaunch()
            }}
          >
            Reset launcher
          </button>
          <button
            className='button btntheme1'
            title='If you pause or cancel a download, it will be removed here.'
            onClick={async () => {
              if (
                await exists(
                  (customDataLocation ? customDataLocation + '/' : null) +
                    'downloads',
                  {
                    baseDir: customDataLocation
                      ? undefined
                      : BaseDirectory.AppLocalData
                  }
                )
              )
                await remove(
                  (customDataLocation ? customDataLocation + '/' : null) +
                    'downloads',
                  {
                    baseDir: customDataLocation
                      ? undefined
                      : BaseDirectory.AppLocalData,
                    recursive: true
                  }
                )
            }}
          >
            Delete download cache
          </button>
          <button
            className='button btntheme1'
            title='If you had a game that was downloaded before it was taken down after you downloaded it, it will get removed here.'
            onClick={async () => {
              const items = await readDir(
                (customDataLocation ? customDataLocation + '/' : null) + 'game',
                {
                  baseDir: customDataLocation
                    ? undefined
                    : BaseDirectory.AppLocalData
                }
              )

              const removed: string[] = []
              for (const item of items) {
                if (item.isFile || item.isSymlink) continue
                if (
                  !Object.entries(versionsList).find(v => v[0] == item.name)
                ) {
                  removed.push(item.name)
                  await remove(
                    (customDataLocation ? customDataLocation + '/' : null) +
                      'game/' +
                      item.name,
                    {
                      baseDir: customDataLocation
                        ? undefined
                        : BaseDirectory.AppLocalData,
                      recursive: true
                    }
                  )
                }
              }

              await message(
                'Removed the following game items: ' +
                  (removed.length == 0 ? '(none)' : removed.join(', ')),
                { title: 'Sucessfully cleaned games folder', kind: 'info' }
              )
            }}
          >
            Delete invalid/unavailable games
          </button>
          <button
            className='button btntheme1'
            title="Restarts the launcher. I don't think I needed to add this description."
            onClick={async () => await openPath(await appLocalDataDir())}
          >
            Open app data folder
          </button>
          {customDataLocation && (
            <button
              className='button btntheme1'
              title="Restarts the launcher. I don't think I needed to add this description."
              onClick={async () => await openPath(customDataLocation)}
            >
              Open custom app data folder
            </button>
          )}
          <p className='text-center'>Hover buttons for descriptions</p>
        </div>
      </div>
      <p
        className='fixed bottom-1.5 right-1.5 rounded-md cursor-pointer px-1 border z-100 transition-colors btntheme1'
        onClick={async () => await copyToClipboard(`v${version}`)}
        title='The current launcher version.'
      >
        v{version}
      </p>
    </>
  )
}
