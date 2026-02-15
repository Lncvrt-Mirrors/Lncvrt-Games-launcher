'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from '@/componets/Sidebar'
import './Globals.css'
import { DownloadProgress } from '@/types/DownloadProgress'
import { invoke } from '@tauri-apps/api/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faXmark } from '@fortawesome/free-solid-svg-icons'
import {
  readNormalConfig,
  readVersionsConfig,
  writeVersionsConfig
} from '@/lib/BazookaManager'
import { VersionsConfig } from '@/types/VersionsConfig'
import { NormalConfig } from '@/types/NormalConfig'
import { app } from '@tauri-apps/api'
import axios from 'axios'
import { openUrl } from '@tauri-apps/plugin-opener'
import { GlobalProvider } from './GlobalProvider'
import { Roboto } from 'next/font/google'
import { ServerVersionsResponse } from '@/types/ServerVersionsResponse'
import { GameVersion } from '@/types/GameVersion'
import { Game } from '@/types/Game'
import { listen } from '@tauri-apps/api/event'
import { usePathname } from 'next/navigation'
import { arch, platform } from '@tauri-apps/plugin-os'
import { notifyUser } from '@/lib/Notifications'
import {
  isPermissionGranted,
  requestPermission
} from '@tauri-apps/plugin-notification'
import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs'

import VersionsDownloadPopup from '@/componets/popups/VersionsDownload'
import GamesDownloadPopup from '@/componets/popups/GamesDownload'
import DownloadsPopup from '@/componets/popups/Downloads'
import VersionVersionPopup from '@/componets/popups/VersionVersion'

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
  const [downloadQueue, setDownloadQueue] = useState<string[]>([])
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false)
  const [managingVersion, setManagingVersion] = useState<string | null>(null)
  const [viewingInfoFromDownloads, setViewingInfoFromDownloads] =
    useState<boolean>(false)
  const [selectedGame, setSelectedGame] = useState<number | null>(null)

  const [category, setCategory] = useState<number>(-1)

  const pathname = usePathname()
  const revisionCheck = useRef(false)
  const previousQueueLength = useRef(0)

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
        if (category != -1 && v.category != category) return false
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

  const closePopup = useCallback(() => {
    if (popupMode == 0 && selectedGame && pathname === '/') {
      setSelectedGame(null)
      setSelectedVersionList([])
    } else if (viewingInfoFromDownloads) {
      setViewingInfoFromDownloads(false)
      setPopupMode(0)
    } else {
      setFadeOut(true)
      setTimeout(() => setShowPopup(false), 200)
    }
  }, [popupMode, selectedGame, pathname, viewingInfoFromDownloads])

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

      const newVersions = list.filter(
        version =>
          !downloadQueue.includes(version) &&
          !downloadProgress.some(d => d.version === version)
      )

      if (newVersions.length === 0) return

      const newDownloads = newVersions.map(
        version =>
          new DownloadProgress(version, 0, 0, false, true, false, false, 0, 0)
      )

      setDownloadProgress(prev => [...prev, ...newDownloads])
      setDownloadQueue(prev => [...prev, ...newVersions])
    },
    [downloadQueue, downloadProgress]
  )

  useEffect(() => {
    if (isProcessingQueue || downloadQueue.length === 0) return

    const processNextDownload = async () => {
      setIsProcessingQueue(true)

      const versionId = downloadQueue[0]
      const info = getVersionInfo(versionId)

      if (!info) {
        setDownloadProgress(prev => prev.filter(d => d.version !== versionId))
        setDownloadQueue(prev => prev.slice(1))
        setIsProcessingQueue(false)
        return
      }

      const gameInfo = getGameInfo(info.game)
      if (!gameInfo) {
        setDownloadProgress(prev => prev.filter(d => d.version !== versionId))
        setDownloadQueue(prev => prev.slice(1))
        setIsProcessingQueue(false)
        return
      }

      setDownloadProgress(prev =>
        prev.map(d => (d.version === versionId ? { ...d, queued: false } : d))
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
        setDownloadProgress(prev => prev.filter(d => d.version !== versionId))
        setDownloadedVersionsConfig(prev => {
          if (!prev) return prev

          const updated = {
            ...prev,
            list: {
              ...prev.list,
              [versionId]: Date.now()
            }
          }

          writeVersionsConfig(updated)
          return updated
        })
      } else {
        setDownloadProgress(prev =>
          prev.map(d =>
            d.version === versionId
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

      setDownloadQueue(prev => prev.slice(1))
      setIsProcessingQueue(false)
    }

    processNextDownload()
  }, [
    downloadQueue,
    isProcessingQueue,
    getVersionInfo,
    getGameInfo,
    normalConfig
  ])

  useEffect(() => {
    if (
      downloadQueue.length === 0 &&
      downloadProgress.length === 0 &&
      !isProcessingQueue &&
      previousQueueLength.current > 0 &&
      normalConfig?.settings.allowNotifications
    ) {
      notifyUser('Downloads Finished', 'All downloads have finished.')
      setTimeout(() => closePopup(), 0)
    }
    previousQueueLength.current = downloadQueue.length + downloadProgress.length
  }, [
    downloadQueue,
    downloadProgress,
    isProcessingQueue,
    normalConfig,
    closePopup
  ])

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
                setCategory,
                downloadQueue,
                setDownloadQueue,
                closePopup,
                getSpecialVersionsList,
                selectedGame,
                setViewingInfoFromDownloads
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
                  className='relative z-2 ml-59.75 w-[calc(100vw-239px)] border-b border-b-(--col3) h-8.25 bg-(--col1)'
                  hidden={platform() != 'windows'}
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
                        <VersionsDownloadPopup />
                      ) : popupMode === 0 && !selectedGame ? (
                        <GamesDownloadPopup />
                      ) : popupMode === 1 ? (
                        <DownloadsPopup />
                      ) : popupMode === 2 ? (
                        <VersionVersionPopup />
                      ) : null}
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
