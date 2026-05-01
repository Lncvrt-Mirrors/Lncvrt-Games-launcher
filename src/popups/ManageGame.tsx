'use client'

import {
  faCheck,
  faCode,
  faDownload,
  faHardDrive,
  faShieldHalved,
  faWarning
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useGlobal } from '@/providers/GlobalProvider'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useMemo, useState } from 'react'
import prettyBytes from 'pretty-bytes'
import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs'

export default function ManageGamePopup () {
  const {
    versionsList,
    serverVersionList,
    viewingInfoFromDownloads,
    closePopup,
    versions,
    customDataLocation,
    managingGame
  } = useGlobal()
  const [gameSize, setGameSize] = useState<number>(0)

  const versionsInstalled = useMemo(() => {
    return serverVersionList?.versions.filter(
      vf => vf.game == managingGame && Object.keys(versionsList).includes(vf.id)
    )
  }, [serverVersionList, managingGame, versionsList])
  const gameInfo = serverVersionList?.games.find(vf => vf.id == managingGame)

  useEffect(() => {
    if (viewingInfoFromDownloads || !versionsInstalled) return

    let cancelled = false

    const run = async () => {
      let total = 0
      setGameSize(0)

      for (const version of versionsInstalled) {
        if (cancelled) return

        const size = await invoke<string>('folder_size', {
          version: version.id
        }).catch(() => '0')

        total += Number(size)
        setGameSize(total)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [versionsInstalled, viewingInfoFromDownloads])

  return (
    <>
      <p className='text-xl text-center'>Viewing {gameInfo?.name}</p>
      <div className='popup-content flex flex-col items-center justify-center gap-2 h-full'>
        <div className='entry-info-item btntheme2' hidden={!gameInfo?.official}>
          <FontAwesomeIcon icon={faCheck} color='#19c84b' />
          <p>Official</p>
        </div>
        <div className='entry-info-item btntheme2' hidden={gameInfo?.official}>
          <FontAwesomeIcon
            icon={gameInfo?.verified ? faShieldHalved : faWarning}
            color={gameInfo?.verified ? '#19c84b' : '#ffc800'}
          />
          <p>{gameInfo?.verified ? 'Verified' : 'Unverified'}</p>
        </div>
        <div
          className='entry-info-item btntheme2'
          hidden={gameInfo?.developer == null}
        >
          <FontAwesomeIcon icon={faCode} color='lightgray' />
          <p>Developer: {gameInfo?.developer}</p>
        </div>
        <div className='entry-info-item btntheme2' hidden={!gameInfo?.official}>
          <FontAwesomeIcon icon={faDownload} color='lightgray' />
          <p>
            {(() => {
              if (!serverVersionList) return 'N/A'

              const gameVersions = serverVersionList.versions.filter(
                vf => vf.game === managingGame
              )
              const installed = gameVersions.filter(v =>
                Object.keys(versionsList).includes(v.id)
              ).length
              return gameVersions.length
                ? `${installed}/${gameVersions.length}`
                : 'N/A'
            })()}{' '}
            versions installed
          </p>
        </div>
        <div
          className='entry-info-item btntheme2'
          hidden={viewingInfoFromDownloads}
        >
          <FontAwesomeIcon icon={faHardDrive} color='lightgray' />
          <p>
            Size on disk:{' '}
            {gameSize && gameSize > 0
              ? prettyBytes(gameSize, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
              : 'N/A'}
          </p>
        </div>
        <div
          className='entry-info-item btntheme2'
          onClick={async () => {
            closePopup()
            if (!versionsInstalled) return

            const updatedList = { ...versionsList }

            for (const version of versionsInstalled)
              delete updatedList[version.id]

            await versions?.set('list', updatedList)

            for (const version of versionsInstalled) {
              const managingVersion = version.id

              if (
                await exists(
                  (customDataLocation ? customDataLocation + '/' : null) +
                    'game/' +
                    managingVersion,
                  {
                    baseDir: customDataLocation
                      ? undefined
                      : BaseDirectory.AppLocalData
                  }
                )
              )
                await remove(
                  (customDataLocation ? customDataLocation + '/' : null) +
                    'game/' +
                    managingVersion,
                  {
                    baseDir: customDataLocation
                      ? undefined
                      : BaseDirectory.AppLocalData,
                    recursive: true
                  }
                )
            }
          }}
          title='Click to uninstall this game. This will NOT remove any progress or any save files.'
          hidden={viewingInfoFromDownloads}
        >
          Uninstall
        </div>
      </div>
    </>
  )
}
