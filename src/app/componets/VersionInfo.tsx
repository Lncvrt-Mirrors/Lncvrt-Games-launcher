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
import { useGlobal } from '../GlobalProvider'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import prettyBytes from 'pretty-bytes'

export default function VersionInfo () {
  const {
    getGameInfo,
    getVersionInfo,
    managingVersion,
    downloadedVersionsConfig,
    viewingInfoFromDownloads,
    setPopupMode
  } = useGlobal()
  if (!managingVersion || !downloadedVersionsConfig) return <></>

  const versionInfo = getVersionInfo(managingVersion)
  const gameInfo = getGameInfo(versionInfo?.game)
  const [versionSize, setVersionSize] = useState<number | null>(null)

  useEffect(() => {
    invoke<string>('folder_size', {
      version: managingVersion
    }).then(size => {
      setVersionSize(parseInt(size, 10))
    })
  }, [managingVersion, setVersionSize])

  return (
    <>
      <p className='text-xl text-center'>
        Viewing info for {versionInfo?.displayName}
      </p>
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
          hidden={viewingInfoFromDownloads || versionSize === null}
        >
          <FontAwesomeIcon icon={faHardDrive} color='lightgray' />
          <p>
            Size on disk:{' '}
            {versionSize !== null
              ? prettyBytes(versionSize, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
              : 'Loading...'}
          </p>
        </div>
        <div className='entry-info-item btntheme2' hidden={!versionInfo}>
          <FontAwesomeIcon icon={faHardDrive} color='lightgray' />
          <p>
            Size when downloaded (zipped):{' '}
            {versionInfo
              ? prettyBytes(versionInfo.size, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
              : 'Loading...'}
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
      </div>
    </>
  )
}
