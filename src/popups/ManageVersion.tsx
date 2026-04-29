'use client'

import {
  faArrowUpRightFromSquare,
  faCheck,
  faCode,
  faHardDrive,
  faShieldHalved,
  faWarning
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useGlobal } from '@/providers/GlobalProvider'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import prettyBytes from 'pretty-bytes'
import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs'
import { openFolder } from '@/lib/util'

export default function ManageVersionPopup () {
  const {
    versionsList,
    serverVersionList,
    managingVersion,
    viewingInfoFromDownloads,
    setManagingVersion,
    closePopup,
    setPopupMode,
    setSelectedVersionList,
    downloadVersions,
    versions,
    customDataLocation
  } = useGlobal()
  const [versionSize, setVersionSize] = useState<number>(0)

  useEffect(() => {
    if (viewingInfoFromDownloads) return
    invoke<string>('folder_size', {
      version: managingVersion
    }).then(size => {
      setVersionSize(Number(size))
    })
  }, [managingVersion, setVersionSize, viewingInfoFromDownloads])

  if (!managingVersion) return <></>

  const versionInfo = serverVersionList?.versions.find(
    vf => vf.id == managingVersion
  )
  const gameInfo = serverVersionList?.games.find(
    vf => vf.id == versionInfo?.game
  )

  return (
    <>
      <p className='text-xl text-center'>Viewing {versionInfo?.displayName}</p>
      <div className='popup-content flex flex-col items-center justify-center gap-2 h-full'>
        <div
          className='entry-info-item btntheme2'
          hidden={viewingInfoFromDownloads}
        >
          <p>
            Installed{' '}
            {new Intl.DateTimeFormat(undefined).format(
              versionsList[managingVersion] ?? 0
            )}
          </p>
        </div>
        <div
          className='entry-info-item btntheme2'
          hidden={!versionInfo || versionInfo.releaseDate == 0}
        >
          <p>
            Released{' '}
            {new Intl.DateTimeFormat(undefined).format(
              versionInfo?.releaseDate ? versionInfo.releaseDate * 1000 : 0
            )}
          </p>
        </div>
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
        <div
          className='entry-info-item btntheme2'
          hidden={viewingInfoFromDownloads}
        >
          <FontAwesomeIcon icon={faHardDrive} color='lightgray' />
          <p>
            Size on disk:{' '}
            {versionSize && versionSize > 0
              ? prettyBytes(versionSize, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
              : 'N/A'}
          </p>
        </div>
        <div
          className='entry-info-item btntheme2'
          onClick={() => setPopupMode(4)}
          hidden={!versionInfo?.changelog}
        >
          <p>View Changelog</p>
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} color='lightgray' />
        </div>
        <div
          className='entry-info-item btntheme2'
          onClick={async () => openFolder(managingVersion)}
          title="Click to browse the game's files."
          hidden={viewingInfoFromDownloads}
        >
          Open Folder
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} color='lightgray' />
        </div>
        <div
          className='entry-info-item btntheme2'
          onClick={async () => {
            closePopup()

            versions?.set(
              'list',
              Object.fromEntries(
                Object.entries(versionsList).filter(
                  ([k]) => k !== managingVersion
                )
              )
            )

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
          }}
          title='Click to uninstall this game. This will NOT remove any progress or any save files.'
          hidden={viewingInfoFromDownloads}
        >
          Uninstall
        </div>
        <div
          className='entry-info-item btntheme2'
          onClick={async () => {
            //change popup to downloads
            setManagingVersion(null)
            setPopupMode(1)

            //uninstall
            versions?.set(
              'list',
              Object.fromEntries(
                Object.entries(versionsList).filter(
                  ([k]) => k !== managingVersion
                )
              )
            )

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

            //reinstall
            setSelectedVersionList([managingVersion])
            downloadVersions([
              {
                id: managingVersion,
                type: 0
              }
            ])
          }}
          title="Click to reinstall this game. This will NOT remove any progress or any save files. This WILL uninstall any modifications to the game's executable files."
          hidden={viewingInfoFromDownloads}
        >
          Reinstall
        </div>
      </div>
    </>
  )
}
