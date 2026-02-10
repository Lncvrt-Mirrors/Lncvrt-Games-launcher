'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from './componets/Sidebar'
import './Globals.css'
import { DownloadProgress } from './types/DownloadProgress'
import { invoke } from '@tauri-apps/api/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faAdd,
  faCheck,
  faChevronLeft,
  faCode,
  faDownload,
  faInfo,
  faRemove,
  faShieldHalved,
  faWarning,
  faXmark
} from '@fortawesome/free-solid-svg-icons'
import {
  readNormalConfig,
  readVersionsConfig,
  writeVersionsConfig
} from './util/BazookaManager'
import { VersionsConfig } from './types/VersionsConfig'
import { NormalConfig } from './types/NormalConfig'
import { app } from '@tauri-apps/api'
import axios from 'axios'
import { openUrl } from '@tauri-apps/plugin-opener'
import { GlobalProvider } from './GlobalProvider'
import { Roboto } from 'next/font/google'
import { ServerVersionsResponse } from './types/ServerVersionsResponse'
import { GameVersion } from './types/GameVersion'
import { Game } from './types/Game'
import { listen } from '@tauri-apps/api/event'
import { usePathname } from 'next/navigation'
import { arch, platform } from '@tauri-apps/plugin-os'
import VersionInfo from './componets/VersionInfo'
import prettyBytes from 'pretty-bytes'
import ProgressBar from './componets/ProgressBar'
import { notifyUser } from './util/Notifications'
import {
  isPermissionGranted,
  requestPermission
} from '@tauri-apps/plugin-notification'
import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs'

const roboto = Roboto({
  subsets: ['latin']
})

export default function RootLayout ({
  children
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('Loading...')
  const [outdated, setOutdated] = useState(false)
  const [version, setVersion] = useState<string | null>(null)

  const [serverVersionList, setServerVersionList] =
    useState<null | ServerVersionsResponse>(null)
  const [selectedVersionList, setSelectedVersionList] = useState<string[]>([])

  const [downloadedVersionsConfig, setDownloadedVersionsConfig] =
    useState<VersionsConfig | null>(null)
  const [normalConfig, setNormalConfig] = useState<NormalConfig | null>(null)

  const [showPopup, setShowPopup] = useState(false)
  const [popupMode, setPopupMode] = useState<null | number>(null)
  const [fadeOut, setFadeOut] = useState(false)

  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress[]>(
    []
  )
  const [managingVersion, setManagingVersion] = useState<string | null>(null)
  const [viewingInfoFromDownloads, setViewingInfoFromDownloads] =
    useState<boolean>(false)
  const [selectedGame, setSelectedGame] = useState<number | null>(null)

  const [category, setCategory] = useState<number>(-1)

  const pathname = usePathname()
  const revisionCheck = useRef(false)

  function getSpecialVersionsList (game?: number): GameVersion[] {
    if (!normalConfig || !serverVersionList) return []

    return serverVersionList.versions
      .filter(
        v => !Object.keys(downloadedVersionsConfig?.list ?? []).includes(v.id)
      )
      .filter(v => {
        if (
          platform() === 'linux' &&
          v.wine &&
          !normalConfig.settings.useWineOnUnixWhenNeeded
        )
          return false

        if (game && v.game != game) return false
        if (downloadProgress.length != 0) {
          return !downloadProgress.some(d => d.version === v.id)
        }
        return true
      })
      .sort((a, b) => {
        if (b.game !== a.game) return a.game - b.game
        return 0
      })
  }

  const getVersionInfo = useCallback(
    (id: string | undefined): GameVersion | undefined => {
      if (!id) return undefined
      return serverVersionList?.versions.find(v => v.id === id)
    },
    [serverVersionList]
  )

  const getGameInfo = useCallback(
    (game: number | undefined): Game | undefined => {
      if (!game) return undefined
      return serverVersionList?.games.find(g => g.id === game)
    },
    [serverVersionList]
  )

  function getListOfGames (): Game[] {
    if (!downloadedVersionsConfig?.list) return []

    const gamesMap = new Map<number, Game>()

    Object.keys(downloadedVersionsConfig.list).forEach(i => {
      const version = getVersionInfo(i)
      if (!version) return
      const game = getGameInfo(version.game)
      if (!game) return
      gamesMap.set(game.id, game)
    })

    return Array.from(gamesMap.values())
  }

  function getVersionsAmountData (gameId: number): {
    installed: number
    total: number
  } | null {
    if (!downloadedVersionsConfig || !serverVersionList) return null

    const allowWine =
      platform() !== 'linux' || normalConfig?.settings.useWineOnUnixWhenNeeded

    const installed = Object.keys(downloadedVersionsConfig.list).filter(v => {
      const info = getVersionInfo(v)
      if (!info) return false
      if (info.wine && !allowWine) return false
      return getGameInfo(info.game)?.id === gameId
    }).length

    const total = serverVersionList.versions.filter(v => {
      if (!v) return false
      if (v.wine && !allowWine) return false
      return getGameInfo(v.game)?.id === gameId
    }).length

    return { installed, total }
  }

  function formatEtaSmart (seconds: number) {
    if (seconds < 60) return `${Math.floor(seconds)}s`
    if (seconds < 3600)
      return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
    if (seconds < 86400) {
      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      return `${h}h ${m}m`
    }
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    return `${d}d ${h}h`
  }

  function closePopup () {
    if (popupMode == 0 && selectedGame && pathname === '/') {
      setSelectedGame(null)
      setSelectedVersionList([])
    } else if (viewingInfoFromDownloads) {
      setViewingInfoFromDownloads(false)
      setPopupMode(0)
    } else if (popupMode == 4) {
      setPopupMode(3)
    } else {
      setFadeOut(true)
      setTimeout(() => setShowPopup(false), 200)
    }
  }

  useEffect(() => {
    let unlistenProgress: (() => void) | null = null

    listen<string>('download-progress', event => {
      const [displayName, progStr, totalSizeStr, speedStr, etaSecsStr] =
        event.payload.split(':')
      const prog = Number(progStr)
      const progBytes = Number(totalSizeStr)
      const speed = Number(speedStr)
      const etaSecs = Number(etaSecsStr)
      setDownloadProgress(prev => {
        const i = prev.findIndex(d => d.version === displayName)
        if (i === -1) return prev
        const copy = [...prev]
        copy[i] = {
          ...copy[i],
          progress: prog,
          progressBytes: progBytes,
          speed,
          etaSecs
        }
        return copy
      })
    }).then(f => (unlistenProgress = f))

    listen<string>('download-hash-checking', event => {
      const displayName = event.payload
      setDownloadProgress(prev => {
        const i = prev.findIndex(d => d.version === displayName)
        if (i === -1) return prev
        const copy = [...prev]
        copy[i] = { ...copy[i], hash_checking: true }
        return copy
      })
    }).then(f => (unlistenProgress = f))

    listen<string>('download-finishing', event => {
      const displayName = event.payload
      setDownloadProgress(prev => {
        const i = prev.findIndex(d => d.version === displayName)
        if (i === -1) return prev
        const copy = [...prev]
        copy[i] = { ...copy[i], hash_checking: false, finishing: true }
        return copy
      })
    }).then(f => (unlistenProgress = f))

    return () => {
      unlistenProgress?.()
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const client = await app.getVersion()
      setVersion(client)
      if (process.env.NODE_ENV === 'production') {
        setLoadingText('Checking latest version...')
        try {
          const response = await axios.get(
            'https://games.lncvrt.xyz/api/launcher/latest'
          )
          if (response.data !== client) {
            setOutdated(true)
            return
          }
        } catch {
          setLoadingText('Failed to check latest version.')
          return
        }
      }
      setLoadingText('Downloading version list...')
      try {
        const res = await axios.get(
          `https://games.lncvrt.xyz/api/launcher/versions?platform=${platform()}&arch=${arch()}`
        )
        setServerVersionList(res.data)
      } catch {
        setLoadingText('Failed to download versions list.')
        return
      }
      setLoadingText('Loading configs...')
      const normalConfig = await readNormalConfig()
      const versionsConfig = await readVersionsConfig()
      setDownloadedVersionsConfig(versionsConfig)
      setNormalConfig(normalConfig)
      setLoading(false)

      if (!(await isPermissionGranted())) {
        await requestPermission()
      }
    })()
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    const handler = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  const downloadVersions = useCallback(
    async (list: string[]): Promise<void> => {
      if (list.length === 0) return
      setSelectedVersionList([])

      const newDownloads = list.map(
        version =>
          new DownloadProgress(version, 0, 0, false, true, false, false, 0, 0)
      )

      setDownloadProgress(newDownloads)

      for (const download of newDownloads) {
        const info = getVersionInfo(download.version)
        if (!info) {
          setDownloadProgress(prev =>
            prev.filter(d => d.version !== download.version)
          )
          continue
        }

        const gameInfo = getGameInfo(info.game)
        if (!gameInfo) {
          setDownloadProgress(prev =>
            prev.filter(d => d.version !== download.version)
          )
          continue
        }

        setDownloadProgress(prev =>
          prev.map(d =>
            d.version === download.version ? { ...d, queued: false } : d
          )
        )

        try {
          await axios.get(
            'https://games.lncvrt.xyz/api/launcher/download?id=' + info.id
          )
        } catch {}

        const res = await invoke<string>('download', {
          url: info.downloadUrl,
          name: info.id,
          executable: info.executable,
          hash: info.sha512sum
        })

        if (res === '1') {
          setDownloadProgress(prev =>
            prev.filter(d => d.version !== download.version)
          )
          setDownloadedVersionsConfig(prev => {
            if (!prev) return prev

            const updated = {
              ...prev,
              list: {
                ...prev.list,
                [download.version]: Date.now()
              }
            }

            writeVersionsConfig(updated)
            return updated
          })
        } else {
          setDownloadProgress(prev =>
            prev.map(d =>
              d.version === download.version
                ? { ...d, queued: false, failed: true, progress: 0 }
                : d
            )
          )
          if (normalConfig?.settings.allowNotifications)
            await notifyUser(
              'Download Failed',
              `The download for version ${info.displayName} has failed.`
            )
        }
      }

      if (normalConfig?.settings.allowNotifications)
        await notifyUser('Downloads Finished', 'All downloads have finished.')

      setFadeOut(true)
      setTimeout(() => setShowPopup(false), 200)
    },
    [getGameInfo, getVersionInfo, normalConfig]
  )

  useEffect(() => {
    if (revisionCheck.current) return
    if (!serverVersionList || !downloadedVersionsConfig) return
    revisionCheck.current = true
    ;(async () => {
      for (const [key, value] of Object.entries(
        downloadedVersionsConfig.list
      )) {
        const verInfo = serverVersionList.versions.find(item => item.id === key)

        if (
          !verInfo ||
          (verInfo.lastRevision > 0 && value / 1000 <= verInfo.lastRevision)
        ) {
          if (
            await exists('game/' + key + '/' + verInfo?.executable, {
              baseDir: BaseDirectory.AppLocalData
            })
          )
            await remove('game/' + key + '/' + verInfo?.executable, {
              baseDir: BaseDirectory.AppLocalData,
              recursive: true
            })
        }
      }
    })()
  }, [serverVersionList, downloadedVersionsConfig, downloadVersions])

  return (
    <>
      <html lang='en' className={roboto.className}>
        <body
          className={
            normalConfig?.settings.theme === 1
              ? 'red-theme'
              : normalConfig?.settings.theme === 2
              ? 'blue-theme'
              : normalConfig?.settings.theme === 3
              ? 'purple-theme'
              : 'dark-theme'
          }
        >
          {loading ? (
            <div className='w-screen h-screen flex items-center justify-center'>
              {outdated ? (
                <div className='text-center'>
                  <p className='text-8xl mb-4'>Outdated Launcher!</p>
                  <p className='text-4xl mb-4'>
                    Please update to the latest version to continue.
                  </p>
                  <button
                    className='button'
                    onClick={() =>
                      openUrl('https://games.lncvrt.xyz/berrydash/download')
                    }
                  >
                    Download latest version
                  </button>
                </div>
              ) : (
                <p className='text-7xl text-center'>{loadingText}</p>
              )}
            </div>
          ) : (
            <GlobalProvider
              value={{
                serverVersionList,
                selectedVersionList,
                setSelectedVersionList,
                downloadProgress,
                setDownloadProgress,
                showPopup,
                setShowPopup,
                popupMode,
                setPopupMode,
                fadeOut,
                setFadeOut,
                downloadedVersionsConfig,
                setDownloadedVersionsConfig,
                normalConfig,
                setNormalConfig,
                managingVersion,
                setManagingVersion,
                getVersionInfo,
                getGameInfo,
                getListOfGames,
                setSelectedGame,
                getVersionsAmountData,
                viewingInfoFromDownloads,
                version,
                downloadVersions,
                category,
                setCategory
              }}
            >
              <div
                tabIndex={0}
                onKeyDown={e => {
                  if (showPopup && e.key === 'Escape') closePopup()
                }}
              >
                <Sidebar />
                <div
                  className='relative z-2 ml-59.75 w-[calc(100vw-239px)] border-b border-(--col3) h-8.25 bg-(--col1)'
                  style={{
                    display: platform() === 'windows' ? 'block' : 'none'
                  }}
                />
                <div className='relative z-0'>
                  <main className='ml-60'>{children}</main>
                </div>
                {showPopup && (
                  <div
                    className={`popup-overlay ${fadeOut ? 'fade-out' : ''}`}
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      if (e.target === e.currentTarget) {
                        if (viewingInfoFromDownloads) {
                          setPopupMode(0)
                          setViewingInfoFromDownloads(false)
                          setManagingVersion(null)
                          setSelectedGame(null)
                        }
                        setFadeOut(true)
                        setTimeout(() => setShowPopup(false), 200)
                      }
                    }}
                  >
                    <div className='popup-box'>
                      <button
                        className='close-button btntheme1'
                        onClick={() => closePopup()}
                      >
                        <FontAwesomeIcon
                          icon={
                            (popupMode == 0 &&
                              selectedGame &&
                              pathname === '/') ||
                            viewingInfoFromDownloads ||
                            popupMode == 4
                              ? faChevronLeft
                              : faXmark
                          }
                        />
                      </button>
                      {popupMode === 0 && selectedGame ? (
                        <>
                          <p className='text-xl text-center'>
                            Select versions to download
                          </p>
                          <div className='popup-content'>
                            {getSpecialVersionsList(selectedGame).map(
                              (v, i) => (
                                <div key={i} className='popup-entry'>
                                  <div className='flex items-center'>
                                    <p
                                      className={`text-2xl truncate ${
                                        selectedVersionList.includes(v.id)
                                          ? 'max-w-84.5'
                                          : 'max-w-91.5'
                                      }`}
                                    >
                                      {v.displayName}
                                    </p>
                                  </div>
                                  <button
                                    className='button btntheme3 right-20.75 bottom-1.75'
                                    onClick={() => {
                                      setSelectedVersionList(prev =>
                                        prev.includes(v.id)
                                          ? prev.filter(i => i !== v.id)
                                          : [...prev, v.id]
                                      )
                                    }}
                                    title={
                                      selectedVersionList.includes(v.id)
                                        ? 'This version will be downloaded. Click to remove from the list of versions that will be downloaded.'
                                        : 'This version will NOT be downloaded. Click to add from the list of versions that will be downloaded.'
                                    }
                                  >
                                    {selectedVersionList.includes(v.id) ? (
                                      <>
                                        <FontAwesomeIcon icon={faRemove} />{' '}
                                        Remove
                                      </>
                                    ) : (
                                      <>
                                        <FontAwesomeIcon icon={faAdd} /> Add
                                      </>
                                    )}
                                  </button>
                                  <button
                                    className='button btntheme3 right-1.5 bottom-1.75'
                                    onClick={() => {
                                      setManagingVersion(v.id)
                                      setViewingInfoFromDownloads(true)
                                      setPopupMode(3)
                                    }}
                                    title='Click to view version info'
                                  >
                                    <FontAwesomeIcon icon={faInfo} /> Info
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        </>
                      ) : popupMode === 0 && !selectedGame ? (
                        <>
                          <p className='text-xl text-center'>
                            Select a game to download
                          </p>
                          <div className='popup-content'>
                            {serverVersionList?.games
                              .filter(v => {
                                const data = getVersionsAmountData(v.id)
                                if (!data) return false
                                if (data.total > 0) return true
                              })
                              .map((v, i) => (
                                <div key={i} className='popup-entry'>
                                  <p className='text-2xl'>{v.name}</p>
                                  <div className='flex gap-2'>
                                    <div
                                      className='entry-info-item btntheme3'
                                      title='The amount of versions installed of this game in installed/installable format.'
                                    >
                                      <p>
                                        {(() => {
                                          const data = getVersionsAmountData(
                                            v.id
                                          )
                                          if (!data) return 'N/A'
                                          return `${data.installed}/${data.total}`
                                        })()}{' '}
                                        versions installed
                                      </p>
                                    </div>
                                    <div
                                      className='entry-info-item btntheme3'
                                      hidden={!v.official}
                                      title='This game is official.'
                                    >
                                      <FontAwesomeIcon
                                        icon={faCheck}
                                        color='#19c84b'
                                      />
                                      <p>Official</p>
                                    </div>
                                    <div
                                      className='entry-info-item btntheme3'
                                      hidden={v.official}
                                      title={
                                        v.verified
                                          ? 'This game is verified to be safe'
                                          : 'This game is NOT verified to be save. Proceed with caution.'
                                      }
                                    >
                                      <FontAwesomeIcon
                                        icon={
                                          v.verified
                                            ? faShieldHalved
                                            : faWarning
                                        }
                                        color={
                                          v.verified ? '#19c84b' : '#ffc800'
                                        }
                                      />
                                      <p>
                                        {v.verified ? 'Verified' : 'Unverified'}
                                      </p>
                                    </div>
                                  </div>
                                  <div
                                    className='entry-info-item btntheme3 mt-2'
                                    hidden={v.developer == null}
                                    title={`The developer of ${v.name} is ${v.developer}.`}
                                  >
                                    <FontAwesomeIcon
                                      icon={faCode}
                                      color='lightgray'
                                    />
                                    <p>Developer: {v.developer}</p>
                                  </div>
                                  <button
                                    className='button btntheme3 right-2 bottom-2'
                                    onClick={() => setSelectedGame(v.id)}
                                    title={`Click to download specific versions of the game. You have ${(() => {
                                      const data = getVersionsAmountData(v.id)
                                      if (!data) return 'N/A'
                                      return `${data.installed} of ${data.total}`
                                    })()} versions downloaded.`}
                                  >
                                    <>
                                      <FontAwesomeIcon icon={faDownload} />{' '}
                                      Download
                                    </>
                                  </button>
                                </div>
                              ))}
                          </div>
                        </>
                      ) : popupMode === 1 ? (
                        <>
                          <p className='text-xl text-center'>Downloads</p>
                          <div className='popup-content'>
                            {downloadProgress.map((v, i) => (
                              <div
                                key={i}
                                className='popup-entry flex flex-col justify-between'
                              >
                                <p className='text-2xl text-center'>
                                  {getVersionInfo(v.version)?.displayName}
                                </p>
                                <div className='mt-6.25 flex items-center justify-between'>
                                  {v.failed ? (
                                    <>
                                      <div className='flex items-center'>
                                        <span className='text-red-500 inline-block w-full text-center'>
                                          Download failed
                                        </span>
                                        <button
                                          className='button btntheme3 ml-30 mb-2'
                                          onClick={() => {
                                            setDownloadProgress(prev =>
                                              prev.filter(
                                                d => d.version !== v.version
                                              )
                                            )
                                          }}
                                          title='Click to remove this version from this menu.'
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </>
                                  ) : v.queued ? (
                                    <span className='text-yellow-500 inline-block w-full text-center'>
                                      Queued…
                                    </span>
                                  ) : v.queued ? (
                                    <span className='text-yellow-500 inline-block w-full text-center'>
                                      Queued…
                                    </span>
                                  ) : v.hash_checking ? (
                                    <span className='text-blue-500 inline-block w-full text-center'>
                                      Checking hash...
                                    </span>
                                  ) : v.finishing ? (
                                    <span className='text-green-500 inline-block w-full text-center'>
                                      Finishing...
                                    </span>
                                  ) : (
                                    <div className='flex flex-col gap-1 w-full'>
                                      <span className='text-center'>
                                        Downloaded{' '}
                                        {prettyBytes(v.progressBytes, {
                                          minimumFractionDigits: 1,
                                          maximumFractionDigits: 1
                                        })}{' '}
                                        of{' '}
                                        {prettyBytes(
                                          getVersionInfo(v.version)?.size ?? 0,
                                          {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1
                                          }
                                        )}{' '}
                                        (ETA: {formatEtaSmart(v.etaSecs)} &bull;
                                        Speed:{' '}
                                        {prettyBytes(v.speed, {
                                          minimumFractionDigits: 1,
                                          maximumFractionDigits: 1
                                        })}
                                        /s)
                                      </span>
                                      <ProgressBar
                                        progress={v.progress}
                                        className='w-full'
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : popupMode === 2 ? (
                        managingVersion ? (
                          <>
                            <p className='text-xl text-center'>
                              Manage{' '}
                              {getVersionInfo(managingVersion)?.displayName}
                            </p>
                            <div className='popup-content flex flex-col items-center justify-center gap-2 h-full'>
                              <button
                                className='button btntheme2'
                                disabled={downloadProgress.length != 0}
                                onClick={async () => {
                                  closePopup()

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
                                }}
                                title='Click to uninstall this game. This will NOT remove any progress or any save files.'
                              >
                                Uninstall
                              </button>
                              <button
                                className='button btntheme2'
                                disabled={downloadProgress.length != 0}
                                onClick={async () => {
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
                                title="Click to reinstall this game. This will NOT remove any progress or any save files. This WILL uninstall any modifications to the game's executable files."
                              >
                                Reinstall
                              </button>
                              <button
                                className='button btntheme2'
                                onClick={async () =>
                                  invoke('open_folder', {
                                    name: managingVersion
                                  })
                                }
                                title="Click to browse the game's files."
                              >
                                Open Folder
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className='text-xl text-center'>
                            No version selected
                          </p>
                        )
                      ) : popupMode === 3 ? (
                        managingVersion && downloadedVersionsConfig ? (
                          <VersionInfo />
                        ) : (
                          <p className='text-xl text-center'>
                            No version selected
                          </p>
                        )
                      ) : null}
                      {popupMode == 0 &&
                        selectedGame &&
                        serverVersionList != null && (
                          <div className='flex justify-center'>
                            <button
                              className='button btntheme1 w-fit mt-2 -mb-4'
                              onClick={() => {
                                setFadeOut(true)
                                setTimeout(() => setShowPopup(false), 200)
                                if (downloadedVersionsConfig)
                                  downloadVersions(selectedVersionList)
                              }}
                              disabled={downloadProgress.length != 0}
                              title={
                                downloadProgress.length != 0
                                  ? "You cannot download the versions as you have another download that hasn't completed."
                                  : `Click to download ${
                                      selectedVersionList.length
                                    } version${
                                      selectedVersionList.length == 1 ? '' : 's'
                                    } of ${getGameInfo(selectedGame)?.name}`
                              }
                            >
                              Download {selectedVersionList.length} version
                              {selectedVersionList.length == 1 ? '' : 's'}
                            </button>
                            <button
                              className='button btntheme1 w-fit mt-2 ml-2 -mb-4'
                              onClick={() => {
                                const allIds = getSpecialVersionsList(
                                  selectedGame
                                ).map(v => v.id)
                                setSelectedVersionList(prev =>
                                  prev.length === allIds.length ? [] : allIds
                                )
                              }}
                              title={
                                selectedVersionList.length ===
                                getSpecialVersionsList(selectedGame).length
                                  ? 'Click to remove all selected versions for download.'
                                  : 'Click to add all selected versions for download.'
                              }
                            >
                              {selectedVersionList.length ===
                              getSpecialVersionsList(selectedGame).length
                                ? 'Deselect All'
                                : 'Select All'}
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </GlobalProvider>
          )}
        </body>
      </html>
    </>
  )
}
