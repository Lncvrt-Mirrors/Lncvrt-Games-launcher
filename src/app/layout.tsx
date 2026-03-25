'use client'

import './Globals.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from '@/componets/Sidebar'
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
import { fetch } from '@tauri-apps/plugin-http'
import { verifySignature } from '@/lib/Util'
import { getCurrentWindow, UserAttentionType } from '@tauri-apps/api/window'

import VersionsDownloadPopup from '@/componets/popups/VersionsDownload'
import GamesDownloadPopup from '@/componets/popups/GamesDownload'
import DownloadsPopup from '@/componets/popups/Downloads'
import ManageVersionPopup from '@/componets/popups/ManageVersion'
import ModDownloadsPopup from '@/componets/popups/ModDownloads'
import { Mod } from '@/types/Mod'

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
  const [platformName, setPlatformName] = useState<string | null>(null)

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
  const [showModInfo, setShowModInfo] = useState<Mod | null>(null)

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
          platformName == 'linux' &&
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
      platformName !== 'linux' || normalConfig?.settings.useWineOnUnixWhenNeeded

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
    } else if (popupMode == 3 && showModInfo) {
      setShowModInfo(null)
    } else {
      setFadeOut(true)
      setTimeout(() => setShowPopup(false), 200)
    }
  }, [popupMode, selectedGame, pathname, viewingInfoFromDownloads, showModInfo])

  useEffect(() => {
    const unlisteners: (() => void)[] = []

    const setupListeners = async () => {
      unlisteners.push(
        await listen<string>('download-size', event => {
          const [displayName, sizeStr] = event.payload.split(':')
          const size = Number(sizeStr)
          setDownloadProgress(prev => {
            const i = prev.findIndex(d => d.version === displayName)
            if (i === -1) return prev
            const copy = [...prev]
            copy[i] = { ...copy[i], size }
            return copy
          })
        })
      )

      unlisteners.push(
        await listen<string>('download-progress', async event => {
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
        })
      )

      unlisteners.push(
        await listen<string>('download-hash-checking', event => {
          const displayName = event.payload
          setDownloadProgress(prev => {
            const i = prev.findIndex(d => d.version === displayName)
            if (i === -1) return prev
            const copy = [...prev]
            copy[i] = { ...copy[i], hash_checking: true, downloading: false }
            return copy
          })
        })
      )

      unlisteners.push(
        await listen<string>('unzip-start', event => {
          const displayName = event.payload
          setDownloadProgress(prev => {
            const i = prev.findIndex(d => d.version === displayName)
            if (i === -1) return prev
            const copy = [...prev]
            copy[i] = { ...copy[i], hash_checking: false, unzipping: true }
            return copy
          })
        })
      )

      unlisteners.push(
        await listen<string>('unzip-progress', async event => {
          const [displayName, unzippedStr, unzipTotalStr] =
            event.payload.split(':')
          const unzipped = Number(unzippedStr)
          const unzipTotal = Number(unzipTotalStr)
          setDownloadProgress(prev => {
            const i = prev.findIndex(d => d.version === displayName)
            if (i === -1) return prev
            const copy = [...prev]
            copy[i] = {
              ...copy[i],
              unzipped,
              unzipTotal
            }
            return copy
          })
        })
      )

      unlisteners.push(
        await listen<string>('download-start', event => {
          const displayName = event.payload
          setDownloadProgress(prev => {
            const i = prev.findIndex(d => d.version === displayName)
            if (i === -1) return prev
            const copy = [...prev]
            copy[i] = {
              ...copy[i],
              downloading: true,
              paused: false,
              failed: false
            }
            return copy
          })
        })
      )

      unlisteners.push(
        await listen<string>('download-stop', event => {
          const displayName = event.payload
          setDownloadProgress(prev => {
            const i = prev.findIndex(d => d.version === displayName)
            if (i === -1) return prev
            const copy = [...prev]
            copy[i] = { ...copy[i], downloading: false }
            return copy
          })
        })
      )
    }

    setupListeners()

    return () => {
      unlisteners.forEach(unlisten => unlisten())
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      setPlatformName(platform())
      const client = await app.getVersion()
      setVersion(client)
      if (process.env.NODE_ENV === 'production') {
        try {
          const response = await fetch(
            'https://games.lncvrt.xyz/api/launcher/latest'
          )
          const signature = response.headers.get('x-signature') ?? ''
          const data = await response.text()
          if (await verifySignature(data, signature)) {
            if (data !== client) {
              setOutdated(true)
              return
            }
          } else {
            setLoadingText('Failed to check latest version.')
            return
          }
        } catch {
          setLoadingText('Failed to check latest version.')
          return
        }
      }
      try {
        const response = await fetch(
          `https://games.lncvrt.xyz/api/launcher/versions?platform=${platform()}&arch=${arch()}`
        )
        const signature = response.headers.get('x-signature') ?? ''
        const data = await response.json()
        if (await verifySignature(JSON.stringify(data), signature)) {
          setServerVersionList(data)
        } else {
          setLoadingText('Failed to download versions list.')
          return
        }
      } catch {
        setLoadingText('Failed to download versions list.')
        return
      }
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

  const downloadVersions = useCallback(
    async (
      list: Array<{
        id: string
        type: 0 | 1 | 2
        modDownload?: number
        gameId?: number
        modId?: number
        modVersion?: string
      }>
    ): Promise<void> => {
      if (list.length === 0) return
      setSelectedVersionList([])

      const newVersions = list.filter(
        item =>
          !downloadQueue.includes(item.id) &&
          !downloadProgress.some(d => d.version === item.id)
      )

      if (newVersions.length === 0) return

      const newDownloads = newVersions.map(
        item =>
          new DownloadProgress(
            item.id,
            0,
            0,
            false,
            false,
            false,
            false,
            true,
            false,
            0,
            0,
            0,
            false,
            0,
            0,
            null,
            null,
            null,
            item.type,
            item.modDownload ?? null,
            item.gameId ?? null,
            item.modId ?? null,
            item.modVersion ?? null
          )
      )

      setDownloadProgress(prev => [...prev, ...newDownloads])
      setDownloadQueue(prev => [...prev, ...newVersions.map(v => v.id)])
    },
    [downloadQueue, downloadProgress]
  )

  useEffect(() => {
    if (isProcessingQueue || downloadQueue.length === 0) return

    const processNextDownload = async () => {
      setIsProcessingQueue(true)

      const versionId = downloadQueue[0]
      const downloadInfo = downloadProgress.find(d => d.version == versionId)
      if (!downloadInfo) return
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

      const downloadInfoRequest = await fetch(
        'https://games.lncvrt.xyz/api/launcher/download' +
          (downloadInfo.type == 0
            ? '?versionId=' + info.id + '&downloadId=' + info.download
            : '?downloadId=' +
              (downloadInfo.type == 1
                ? info.modSupportDownload
                : downloadInfo.modDownload)) +
          (downloadInfo.type == 2 ? '&modId=' + downloadInfo.modId : '')
      )
      const signature = downloadInfoRequest.headers.get('x-signature') ?? ''
      const data = await downloadInfoRequest.json()
      if (
        !(await verifySignature(JSON.stringify(data), signature)) ||
        !data.success
      ) {
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
        await getCurrentWindow().requestUserAttention(
          UserAttentionType.Critical
        )
        return
      }

      setDownloadProgress(prev =>
        prev.map(d =>
          d.version === versionId
            ? {
                ...d,
                url: data.data.url,
                executable: downloadInfo.type == 0 ? info.executable : null,
                hash: data.data.hash
              }
            : d
        )
      )

      const res = await invoke<string>('download', {
        url: data.data.url,
        name: info.id,
        hash: data.data.hash,
        downloadType: downloadInfo.type,
        modId: String(downloadInfo.modId ?? '')
      })

      if (res === '1') {
        setDownloadProgress(prev => prev.filter(d => d.version !== versionId))
        if (downloadInfo.type != 1) {
          setDownloadedVersionsConfig(prev => {
            if (!prev) return prev

            const updated =
              downloadInfo.type == 2
                ? {
                    ...prev,
                    mods: {
                      ...prev.mods,
                      [downloadInfo.modGame! + '-' + downloadInfo.modId!]: {
                        [downloadInfo.modVersion!]: Date.now()
                      }
                    }
                  }
                : {
                    ...prev,
                    list: {
                      ...prev.list,
                      [versionId]: Date.now()
                    }
                  }

            writeVersionsConfig(updated)
            return updated
          })
        }
      } else if (res == '0') {
        setDownloadProgress(prev => {
          const i = prev.findIndex(d => d.version === info.id)
          if (i === -1) return prev
          if (prev[i].canceled) {
            return prev.filter((_, idx) => idx !== i)
          }
          const copy = [...prev]
          copy[i] = {
            ...copy[i],
            downloading: false,
            paused: true,
            failed: false
          }
          return copy
        })
      } else if (res == '-1') {
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
        await getCurrentWindow().requestUserAttention(
          UserAttentionType.Critical
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
    downloadProgress,
    normalConfig
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
            <>
              <div
                className='relative z-2 w-screen border-b border-b-(--col3) h-8.25 bg-(--col1)'
                hidden={platformName != 'windows'}
              />
              <div
                className={`w-screen ${
                  platformName == 'windows'
                    ? 'h-[calc(100vh-64px)]'
                    : 'h-screen'
                } flex items-center justify-center`}
              >
                {outdated ? (
                  <div className='text-center'>
                    <p className='text-6xl mb-4'>Outdated Launcher!</p>
                    <p className='text-2xl mb-4'>
                      Please update to the latest version to continue.
                    </p>
                    <button
                      className='button btntheme1'
                      onClick={() =>
                        openUrl('https://games.lncvrt.xyz/download')
                      }
                    >
                      Download latest version!
                    </button>
                  </div>
                ) : (
                  <p className='text-7xl text-center'>{loadingText}</p>
                )}
              </div>
            </>
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
                setViewingInfoFromDownloads,
                showModInfo,
                setShowModInfo
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
                  hidden={platformName != 'windows'}
                />
                <div className='relative z-0'>
                  <main className='ml-60'>{children}</main>
                </div>
                {showPopup && (
                  <div
                    className={`popup-overlay ${fadeOut ? 'fade-out' : ''}`}
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      if (e.target === e.currentTarget) {
                        if (showModInfo) setShowModInfo(null)
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
                        className='popup-top-button left-2 btntheme1'
                        onClick={() => closePopup()}
                      >
                        <FontAwesomeIcon
                          icon={
                            (popupMode == 0 &&
                              selectedGame &&
                              pathname === '/') ||
                            viewingInfoFromDownloads ||
                            (popupMode == 3 && showModInfo)
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
                        <ManageVersionPopup />
                      ) : popupMode === 3 ? (
                        <ModDownloadsPopup />
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
