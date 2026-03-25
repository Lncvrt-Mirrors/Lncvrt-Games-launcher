'use client'

import { useGlobal } from '@/app/GlobalProvider'
import { writeVersionsConfig } from '@/lib/BazookaManager'
import { verifySignature } from '@/lib/Util'
import { Mod } from '@/types/Mod'
import {
  faArrowUpRightFromSquare,
  faClock,
  faCodeBranch,
  faDownload,
  faGlobe,
  faPeopleGroup,
  faRefresh,
  faTrash
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { message } from '@tauri-apps/plugin-dialog'
import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs'
import { arch, platform } from '@tauri-apps/plugin-os'
import { useEffect, useState } from 'react'

export default function ModDownloadsPopup () {
  const {
    getVersionInfo,
    managingVersion,
    downloadedVersionsConfig,
    showModInfo,
    setShowModInfo,
    downloadVersions,
    downloadProgress,
    setDownloadedVersionsConfig
  } = useGlobal()

  const [mods, setMods] = useState<Mod[] | 0 | 1>(0)
  const [tab, setTab] = useState<number>(0)

  useEffect(() => {
    if (!managingVersion) return
    ;(async () => {
      const response = await fetch(
        `https://games.lncvrt.xyz/api/launcher/mods?platform=${platform()}&arch=${arch()}&version=${managingVersion}`
      )
      const signature = response.headers.get('x-signature') ?? ''
      const data = await response.json()
      if (await verifySignature(JSON.stringify(data), signature)) {
        setMods(data as Mod[])
      } else {
        setMods(1)
      }
    })()
  }, [managingVersion])

  if (!managingVersion) return <></>

  const versionInfo = getVersionInfo(managingVersion)

  return (
    <>
      <button
        className='popup-top-button btntheme1 right-2'
        onClick={async () => {
          setMods(0)
          const response = await fetch(
            `https://games.lncvrt.xyz/api/launcher/mods?platform=${platform()}&arch=${arch()}&version=${managingVersion}`
          )
          const signature = response.headers.get('x-signature') ?? ''
          const data = await response.json()
          if (await verifySignature(JSON.stringify(data), signature)) {
            setMods(data as Mod[])
          } else {
            setMods(1)
          }
        }}
        hidden={typeof mods == 'number' || showModInfo != null}
      >
        <FontAwesomeIcon icon={faRefresh} />
      </button>
      <p className='text-xl text-center'>
        {!showModInfo
          ? versionInfo?.displayName + ' Mod Manager'
          : showModInfo.name +
            ' by ' +
            showModInfo.creators[0] +
            (showModInfo.creators.length > 1
              ? ' + ' + (showModInfo.creators.length - 1) + ' more'
              : '')}
      </p>
      {typeof mods != 'number' && !showModInfo ? (
        <div className='flex flex-row justify-center items-center -mb-2 mt-0.5 gap-1.5'>
          <button
            className={`button ${tab == 0 ? 'btntheme3' : 'btntheme2'}`}
            onClick={() => setTab(0)}
          >
            <FontAwesomeIcon icon={faDownload} />
            Installed
          </button>
          <button
            className={`button ${tab == 1 ? 'btntheme3' : 'btntheme2'}`}
            onClick={() => setTab(1)}
          >
            <FontAwesomeIcon icon={faGlobe} />
            Download
          </button>
        </div>
      ) : null}
      <div className='popup-content h-full'>
        {typeof mods == 'number' ? (
          <p className='text-2xl flex justify-center items-center h-full'>
            {mods == 0 ? 'Loading' : 'Failed to load mods'}
          </p>
        ) : !showModInfo ? (
          <div className='flex flex-col items-center justify-center gap-2 p-2'>
            {mods
              .filter(v =>
                tab == 0
                  ? Object.keys(downloadedVersionsConfig?.mods ?? []).includes(
                      String(versionInfo?.game + '-' + v.id)
                    )
                  : !Object.keys(downloadedVersionsConfig?.mods ?? []).includes(
                      String(versionInfo?.game + '-' + v.id)
                    )
              )
              .map(v => {
                return (
                  <div
                    key={v.id}
                    className='bg-(--col3) border border-(--col5) rounded-lg w-full h-16 flex flex-row'
                  >
                    <div className='flex flex-col justify-center h-full px-3 w-fit'>
                      <p>
                        <span className='text-lg'>{v.name}</span>{' '}
                        <span className='text-green-300'>
                          v{v.latestVersion}
                        </span>
                      </p>
                      <p className='text-yellow-200'>
                        Made by {v.creators[0]}
                        {v.creators.length > 1
                          ? ' + ' + (v.creators.length - 1) + ' more'
                          : null}
                      </p>
                    </div>
                    <div className='flex flex-row items-center h-full gap-2 px-3 ml-auto'>
                      <p className='text-green-400' hidden={tab == 0}>
                        <FontAwesomeIcon icon={faDownload} /> {v.downloads}
                      </p>
                      <button
                        className='button btntheme3'
                        onClick={() => setShowModInfo(v)}
                      >
                        {tab == 0 ? 'View' : 'Get'}
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        ) : (
          <div className='flex flex-col h-full w-full items-center'>
            <div className='flex flex-col p-2 h-fit w-fit bg-(--col3) border border-(--col5) rounded-lg m-2 items-center'>
              <p>
                <FontAwesomeIcon icon={faDownload} className='text-green-400' />{' '}
                Downloads {showModInfo.downloads}
              </p>
              <p>
                <FontAwesomeIcon icon={faClock} /> Released{' '}
                {new Intl.DateTimeFormat(undefined).format(
                  showModInfo.released * 1000
                )}
              </p>
              <p>
                <FontAwesomeIcon icon={faClock} /> Updated{' '}
                {new Intl.DateTimeFormat(undefined).format(
                  showModInfo.updated * 1000
                )}
              </p>
              <p>
                <FontAwesomeIcon icon={faCodeBranch} /> Version{' '}
                {showModInfo.latestVersion}
              </p>
            </div>
            <div className='flex flex-col p-2 bg-(--col3) border border-(--col5) rounded-lg h-full w-[calc(100%-16px)]'>
              {showModInfo.description ?? '(No description added)'}
            </div>
            <div className='flex flex-row h-fit w-full gap-2 justify-center my-2'>
              {Object.keys(downloadedVersionsConfig?.mods ?? []).includes(
                String(versionInfo?.game + '-' + showModInfo.id)
              ) ? (
                <button
                  className='button btntheme2 w-fit'
                  disabled={downloadProgress.length != 0}
                  onClick={async () => {
                    const path =
                      'game/' +
                      versionInfo?.id +
                      '/BepInEx/plugins/' +
                      showModInfo.id
                    if (
                      await exists(path, {
                        baseDir: BaseDirectory.AppLocalData
                      })
                    )
                      await remove(path, {
                        baseDir: BaseDirectory.AppLocalData,
                        recursive: true
                      })
                    setDownloadedVersionsConfig(prev => {
                      if (!prev) return prev
                      const updatedMods = Object.fromEntries(
                        Object.entries(prev.mods).filter(
                          ([k]) =>
                            k !== versionInfo?.game + '-' + showModInfo.id
                        )
                      )
                      const updatedConfig = {
                        ...prev,
                        mods: updatedMods
                      }
                      writeVersionsConfig(updatedConfig)
                      return updatedConfig
                    })
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} className='text-red-400' />{' '}
                  Uninstall
                </button>
              ) : (
                <button
                  className='button btntheme2 w-fit'
                  onClick={() => {
                    downloadVersions([
                      {
                        id: managingVersion,
                        type: 2,
                        modDownload: showModInfo.latestDownload,
                        gameId: versionInfo?.game,
                        modId: showModInfo.id,
                        modVersion: showModInfo.latestVersion
                      }
                    ])
                  }}
                  disabled={downloadProgress.length != 0}
                >
                  <FontAwesomeIcon
                    icon={faDownload}
                    className='text-green-400'
                  />{' '}
                  Install
                </button>
              )}
              <button
                className='button btntheme2 w-fit'
                onClick={async () => {
                  await message(
                    !showModInfo.changelog
                      ? '(No changelog provided)'
                      : atob(showModInfo?.changelog ?? ''),
                    {
                      title: 'Changelog for ' + showModInfo.name,
                      kind: 'info'
                    }
                  )
                }}
              >
                <FontAwesomeIcon
                  icon={faArrowUpRightFromSquare}
                  color='lightgray'
                />{' '}
                View changelog
              </button>
              <button
                className='button btntheme2 w-fit'
                hidden={showModInfo.creators.length < 2}
                onClick={async () => {
                  if (!versionInfo) return
                  await message(showModInfo.creators.join(', '), {
                    title: 'Creators for ' + showModInfo.name,
                    kind: 'info'
                  })
                }}
              >
                <FontAwesomeIcon icon={faPeopleGroup} color='lightgray' /> View
                all creators
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
