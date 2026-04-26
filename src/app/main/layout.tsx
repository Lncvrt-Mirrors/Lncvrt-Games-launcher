'use client'

import '@/styles/globals.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { DownloadProgress } from '@/types/DownloadProgress'
import { app } from '@tauri-apps/api'
import { GlobalProvider } from '@/providers/GlobalProvider'
import { Roboto } from 'next/font/google'
import { ServerVersionsResponse } from '@/types/ServerVersionsResponse'
import { listen } from '@tauri-apps/api/event'
import { usePathname } from 'next/navigation'
import { arch, platform } from '@tauri-apps/plugin-os'
import {
  isPermissionGranted,
  requestPermission
} from '@tauri-apps/plugin-notification'
import {
  BaseDirectory,
  copyFile,
  exists,
  readTextFile,
  remove
} from '@tauri-apps/plugin-fs'
import { fetch } from '@tauri-apps/plugin-http'
import { verifySignature } from '@/lib/util'
import { getCurrentWindow, UserAttentionType } from '@tauri-apps/api/window'
import { Mod } from '@/types/Mod'
import { load, Store } from '@tauri-apps/plugin-store'
import { notifyUser } from '@/lib/notifications'
import { GameVersion } from '@/types/GameVersion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faXmark } from '@fortawesome/free-solid-svg-icons'
import { invoke } from '@tauri-apps/api/core'
import semver from 'semver'
import { exit } from '@tauri-apps/plugin-process'

import VersionsDownloadPopup from '@/popups/VersionsDownload'
import GamesDownloadPopup from '@/popups/GamesDownload'
import DownloadsPopup from '@/popups/Downloads'
import ManageVersionPopup from '@/popups/ManageVersion'
import ModDownloadsPopup from '@/popups/ModDownloads'
import VersionChangelogPopup from '@/popups/VersionChangelog'

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
  const [version, setVersion] = useState<string | null>(null)
  const [platformName, setPlatformName] = useState<string | null>(null)

  const [serverVersionList, setServerVersionList] =
    useState<null | ServerVersionsResponse>(null)
  const [selectedVersionList, setSelectedVersionList] = useState<string[]>([])

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

  const [settings, setSettings] = useState<Store | null>(null)
  const [versions, setVersions] = useState<Store | null>(null)

  const [notificationsAllowed, setNotificationsAllowed] =
    useState<boolean>(false)
  const [sidebarAlwaysShowGames, setSidebarAlwaysShowGames] =
    useState<boolean>(false)
  const [linuxUseWine, setLinuxUseWine] = useState<boolean>(false)
  const [linuxWineCommand, setLinuxWineCommand] =
    useState<string>('wine %path%')
  const [theme, setTheme] = useState<string>('dark')
  const [customDataLocation, setCustomDataLocation] = useState<string>('')

  const [versionsList, setVersionsList] = useState<Record<string, number>>({})
  const [modsList, setModsList] = useState<
    Record<string, Record<string, number>>
  >({})
  const [movingData, setMovingData] = useState(false)

  function getSpecialVersionsList (game?: number): GameVersion[] {
    if (!serverVersionList) return []

    return serverVersionList.versions
      .filter(v => !Object.keys(versionsList).includes(v.id))
      .filter(v => {
        if (platformName == 'linux' && v.wine && !linuxUseWine) return false

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

  const closePopup = useCallback(() => {
    if (popupMode == 0 && selectedGame && pathname === '/main') {
      setSelectedGame(null)
      setSelectedVersionList([])
    } else if (viewingInfoFromDownloads) {
      setViewingInfoFromDownloads(false)
      setPopupMode(0)
    } else if (popupMode == 3 && showModInfo) {
      setShowModInfo(null)
    } else if (popupMode == 4) {
      setPopupMode(2)
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
      const legacyOptions = {
        baseDir: BaseDirectory.AppLocalData
      }
      if (
        platform() == 'windows' &&
        (await exists('versions.json', legacyOptions))
      ) {
        if (
          await exists('versions.json', {
            baseDir: BaseDirectory.AppConfig
          })
        )
          await remove('versions.json', {
            baseDir: BaseDirectory.AppConfig
          })

        await copyFile('versions.json', 'versions.json', {
          fromPathBaseDir: BaseDirectory.AppLocalData,
          toPathBaseDir: BaseDirectory.AppConfig
        })
        await remove('versions.json', legacyOptions)
      }

      const settingsLocal = await load('settings.json', {
        autoSave: true,
        defaults: {
          version: client,
          notificationsAllowed: true,
          sidebarAlwaysShowGames: true,
          linuxUseWine: false,
          linuxWineCommand: 'wine %path%',
          theme: 'dark',
          customDataLocation: ''
        }
      })
      const versionsLocal = await load('versions.json', {
        autoSave: true,
        defaults: {
          version: client,
          list: {},
          mods: {}
        }
      })
      const cfgVer = (await settingsLocal.get<string>('version')) ?? client
      const versVer = (await versionsLocal.get<string>('version')) ?? client
      if (semver.gt(cfgVer, client) || semver.gt(versVer, client)) {
        exit(1)
        return
      }

      settingsLocal.set('version', client)
      versionsLocal.set('version', client)

      if (await exists('config.json', legacyOptions)) {
        const config = await readTextFile('config.json', legacyOptions)
        const raw = JSON.parse(config)
        if (
          raw.settings &&
          raw.settings.theme &&
          (raw.version == '1.0.0' ||
            raw.version == '1.1.0' ||
            raw.version == '1.1.1' ||
            raw.version == '1.2.0' ||
            raw.version == '1.3.0' ||
            raw.version == '1.3.1' ||
            raw.version == '1.4.0' ||
            raw.version == '1.5.0' ||
            raw.version == '1.5.1' ||
            raw.version == '1.5.2' ||
            raw.version == '1.5.3' ||
            raw.version == '1.5.4')
        ) {
          const parsed = Number(raw.settings.theme)
          if (parsed == 3) raw.settings.theme = 2
          if (parsed == 4) raw.settings.theme = 3
          else if (parsed != 0 && parsed != 1) raw.settings.theme = 0
        }
        if (raw.settings.allowNotifications)
          settingsLocal?.set(
            'notificationsAllowed',
            Boolean(raw.settings.allowNotifications)
          )
        if (raw.settings.alwaysShowGamesInSidebar)
          settingsLocal?.set(
            'sidebarAlwaysShowGames',
            Boolean(raw.settings.alwaysShowGamesInSidebar)
          )
        if (raw.settings.useWineOnUnixWhenNeeded)
          settingsLocal?.set(
            'linuxUseWine',
            Boolean(raw.settings.useWineOnUnixWhenNeeded)
          )
        if (raw.settings.wineOnUnixCommand)
          settingsLocal?.set(
            'linuxWineCommand',
            String(raw.settings.wineOnUnixCommand)
          )
        if (raw.settings.theme) {
          const tempTheme = (() => {
            switch (Number(raw.settings.theme)) {
              case 1:
                return 'red'
              case 2:
                return 'blue'
              case 3:
                return 'purple'
              default:
                return 'dark'
            }
          })()
          settingsLocal?.set('theme', tempTheme)
        }
        await remove('config.json', legacyOptions)
      }
      setSettings(settingsLocal)
      setVersions(versionsLocal)
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
      if (!downloadInfo) {
        setDownloadProgress(prev => prev.filter(d => d.version !== versionId))
        setDownloadQueue(prev => prev.slice(1))
        setIsProcessingQueue(false)
        return
      }
      const info = serverVersionList?.versions.find(vf => vf.id == versionId)

      if (!info) {
        setDownloadProgress(prev => prev.filter(d => d.version !== versionId))
        setDownloadQueue(prev => prev.slice(1))
        setIsProcessingQueue(false)
        return
      }

      const gameInfo = serverVersionList?.games.find(vf => vf.id == info.game)
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
        if (await settings?.get<boolean>('notificationsAllowed'))
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
          if (downloadInfo.type == 2) {
            const currentMods = await versions?.get<Record<string, Record<string, number>>>('mods') ?? {}
            versions?.set('mods', {
              ...currentMods,
              [downloadInfo.modGame! + '-' + downloadInfo.modId!]: {
                [downloadInfo.modVersion!]: Date.now()
              }
            })
          } else {
            const currentList = await versions?.get<Record<string, number>>('list') ?? {}
            versions?.set('list', {
              ...currentList,
              [versionId]: Date.now()
            })
          }
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
        if (await settings?.get<boolean>('notificationsAllowed'))
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
    downloadProgress,
    serverVersionList,
    settings,
    versions,
    versionsList,
    modsList
  ])

  useEffect(() => {
    if (revisionCheck.current) return
    if (!serverVersionList) return
    revisionCheck.current = true
    ;(async () => {
      for (const [key, value] of Object.entries(versionsList)) {
        const verInfo = serverVersionList.versions.find(item => item.id === key)

        if (
          verInfo &&
          verInfo.lastRevision > 0 &&
          value / 1000 <= verInfo.lastRevision
        ) {
          await invoke('remove_stale_executable', {
            version: key,
            executable: verInfo.executable
          })
        }
      }
    })()
  }, [serverVersionList, versionsList])

  useEffect(() => {
    if (
      downloadProgress.length === 0 &&
      downloadQueue.length === 0 &&
      showPopup &&
      popupMode === 1
    ) {
      setTimeout(async () => {
        if (notificationsAllowed) {
          await notifyUser('Downloads Complete', 'All downloads finished!')
        }
        await getCurrentWindow().requestUserAttention(
          UserAttentionType.Informational
        )
        closePopup()
      }, 0)
    }
  }, [
    downloadProgress,
    downloadQueue,
    showPopup,
    popupMode,
    closePopup,
    notificationsAllowed
  ])

  useEffect(() => {
    if (!settings || !versions) return
    const unlisteners: Promise<() => void>[] = []

    function watchSettings<T> (key: string, fn: (v: T | undefined) => void) {
      settings!.get<T>(key).then(fn)
      unlisteners.push(settings!.onKeyChange<T>(key, fn))
    }

    function watchVersions<T> (key: string, fn: (v: T | undefined) => void) {
      versions!.get<T>(key).then(fn)
      unlisteners.push(versions!.onKeyChange<T>(key, fn))
    }

    watchSettings<string>('theme', v => setTheme(v ?? 'dark'))
    watchSettings<boolean>('notificationsAllowed', v =>
      setNotificationsAllowed(v ?? true)
    )
    watchSettings<boolean>('sidebarAlwaysShowGames', v =>
      setSidebarAlwaysShowGames(v ?? true)
    )
    watchSettings<boolean>('linuxUseWine', v => setLinuxUseWine(v ?? false))
    watchSettings<string>('linuxWineCommand', v =>
      setLinuxWineCommand(v ?? 'wine %path%')
    )
    watchSettings<string>('customDataLocation', v =>
      setCustomDataLocation(v ?? '')
    )

    watchVersions<Record<string, number>>('list', v => setVersionsList(v ?? {}))
    watchVersions<Record<string, Record<string, number>>>('mods', v =>
      setModsList(v ?? {})
    )

    return () => {
      unlisteners.forEach(u => u.then(fn => fn()))
    }
  }, [settings, versions])

  return (
    <>
      <html lang='en' className={roboto.className}>
        <body className={theme + '-theme'}>
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
                <p className='text-7xl text-center'>{loadingText}</p>
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
                managingVersion,
                setManagingVersion,
                setSelectedGame,
                viewingInfoFromDownloads,
                version,
                downloadVersions,
                category,
                setCategory,
                downloadQueue,
                setDownloadQueue,
                closePopup,
                selectedGame,
                setViewingInfoFromDownloads,
                showModInfo,
                setShowModInfo,
                getSpecialVersionsList,
                settings,
                versions,
                notificationsAllowed,
                sidebarAlwaysShowGames,
                linuxUseWine,
                linuxWineCommand,
                theme,
                customDataLocation,
                versionsList,
                modsList,
                movingData,
                setMovingData
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
                            (popupMode == 3 && showModInfo) ||
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
                        <ManageVersionPopup />
                      ) : popupMode === 3 ? (
                        <ModDownloadsPopup />
                      ) : popupMode === 4 ? (
                        <VersionChangelogPopup />
                      ) : null}
                    </div>
                  </div>
                )}
                {movingData && (
                  <div className='fixed inset-0 z-999999 bg-(--col0) flex items-center justify-center'>
                    <p className='text-5xl text-center'>Moving data...</p>
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
