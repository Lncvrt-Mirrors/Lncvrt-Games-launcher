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
import { useGlobal } from '@/app/GlobalProvider'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import prettyBytes from 'pretty-bytes'
import { message } from '@tauri-apps/plugin-dialog'
import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs'
import { writeVersionsConfig } from '@/lib/BazookaManager'
import { openFolder } from '@/lib/Util'

export default function ManageVersionPopup () {
  const {
    getGameInfo,
    getVersionInfo,
    managingVersion,
    downloadedVersionsConfig,
    viewingInfoFromDownloads,
    setManagingVersion,
    closePopup,
    setDownloadedVersionsConfig,
    setPopupMode,
    setSelectedVersionList,
    downloadVersions
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

  if (!managingVersion || !downloadedVersionsConfig) return <></>

  const versionInfo = getVersionInfo(managingVersion)
  const gameInfo = getGameInfo(versionInfo?.game)

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
              downloadedVersionsConfig.list[managingVersion] ?? 0
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
          onClick={async () => {
            if (!versionInfo) return
            await message(atob(versionInfo.changelog), {
              title: 'Changelog for ' + versionInfo.displayName,
              kind: 'info'
            })
          }}
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

            setDownloadedVersionsConfig(prev => {
              if (!prev) return prev
              const updatedList = Object.fromEntries(
                Object.entries(prev.list).filter(([k]) => k !== managingVersion)
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
            setDownloadedVersionsConfig(prev => {
              if (!prev) return prev
              const updatedList = Object.fromEntries(
                Object.entries(prev.list).filter(([k]) => k !== managingVersion)
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
