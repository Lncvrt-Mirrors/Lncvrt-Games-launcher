'use client'

import { invoke } from '@tauri-apps/api/core'
import { useGlobal } from '../GlobalProvider'
import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs'
import { writeVersionsConfig } from '../util/BazookaManager'
import { useState } from 'react'

export default function VersionUpdateWarning () {
  const [confirmed, setConfirmed] = useState<-1 | 0>(-1)

  const {
    managingVersion,
    setDownloadedVersionsConfig,
    setManagingVersion,
    setPopupMode,
    setSelectedVersionList,
    downloadVersions
  } = useGlobal()
  if (!managingVersion) return <p>Error</p>

  return (
    <>
      <p className='text-xl text-center'>Warning!</p>
      <div className='popup-content text-center p-2 relative'>
        <p className='mb-2'>
          Before proceeding, please note that any modifications to the
          installation directory <b>(NOT THE SAVE DATA)</b> will be completely
          wiped/reset.
        </p>
        <p>
          If you do not want your installation directory wiped just yet, please
          backup the files to another directory. When you click update, it will
          be wiped.
        </p>
        <p className='my-2'>
          Updating will have the same effect as clicking the uninstall button
          then installing again.
        </p>
        <p>Revisions are not a frequent thing and rarely ever happen.</p>
        <div className='flex flex-row gap-2 absolute bottom-2 left-1/2 -translate-x-1/2 w-max'>
          <button
            className='button btntheme2'
            onClick={async () =>
              invoke('open_folder', {
                name: managingVersion
              })
            }
            title="Click to browse the game's files."
          >
            Open Folder / Installation directory
          </button>
          <button
            className='button btntheme2'
            onClick={async () => {
              if (confirmed == -1) {
                setConfirmed(0)
                return
              }

              //change popup to downloads
              setManagingVersion(null)
              setPopupMode(1)

              //uninstall
              setDownloadedVersionsConfig(prev => {
                if (!prev) return prev
                const updatedList = Object.fromEntries(
                  Object.entries(prev.list).filter(
                    ([k]) => k !== managingVersion
                  )
                )
                const updatedConfig = {
                  ...prev,
                  list: updatedList
                }
                writeVersionsConfig(updatedConfig)
                return updatedConfig
              })

              if (
                await exists('game/' + managingVersion, {
                  baseDir: BaseDirectory.AppLocalData
                })
              )
                await remove('game/' + managingVersion, {
                  baseDir: BaseDirectory.AppLocalData,
                  recursive: true
                })

              //reinstall
              setSelectedVersionList([managingVersion])
              downloadVersions([managingVersion])
            }}
            title='Click to update the game'
          >
            <span className='text-red-500 font-bold underline'>
              {confirmed == -1 ? 'Update' : 'Are you sure?'}
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
