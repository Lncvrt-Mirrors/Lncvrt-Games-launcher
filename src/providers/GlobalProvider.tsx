'use client'

import {
  createContext,
  useContext,
  ReactNode,
  Dispatch,
  SetStateAction
} from 'react'
import { DownloadProgress } from '@/types/DownloadProgress'
import { ServerVersionsResponse } from '@/types/ServerVersionsResponse'
import { Mod } from '@/types/Mod'
import { Store } from '@tauri-apps/plugin-store'
import { GameVersion } from '@/types/GameVersion'

type GlobalCtxType = {
  serverVersionList: ServerVersionsResponse | null
  selectedVersionList: string[]
  setSelectedVersionList: (value: SetStateAction<string[]>) => void
  downloadProgress: DownloadProgress[]
  setDownloadProgress: Dispatch<SetStateAction<DownloadProgress[]>>
  showPopup: boolean
  setShowPopup: Dispatch<SetStateAction<boolean>>
  popupMode: number | null
  setPopupMode: Dispatch<SetStateAction<number | null>>
  fadeOut: boolean
  setFadeOut: Dispatch<SetStateAction<boolean>>
  managingVersion: string | null
  setManagingVersion: Dispatch<SetStateAction<string | null>>
  setSelectedGame: Dispatch<SetStateAction<number | null>>
  viewingInfoFromDownloads: boolean
  version: string | null
  downloadVersions: (
    list: Array<{
      id: string
      type: 0 | 1 | 2
      modDownload?: number
      gameId?: number
      modId?: number
      modVersion?: string
    }>
  ) => Promise<void>
  category: number
  setCategory: Dispatch<SetStateAction<number>>
  downloadQueue: string[]
  setDownloadQueue: Dispatch<SetStateAction<string[]>>
  closePopup: () => void
  selectedGame: number | null
  setViewingInfoFromDownloads: Dispatch<SetStateAction<boolean>>
  showModInfo: Mod | null
  setShowModInfo: Dispatch<SetStateAction<Mod | null>>
  getSpecialVersionsList: (game?: number) => GameVersion[]
  settings: Store | null
  versions: Store | null
  notificationsAllowed: boolean
  sidebarAlwaysShowGames: boolean
  linuxUseWine: boolean
  linuxWineCommand: string
  theme: string
  customDataLocation: string
  versionsList: Record<string, number>
  modsList: Record<string, Record<string, number>>
  movingData: boolean
  setMovingData: Dispatch<SetStateAction<boolean>>
  managingGame: number | null
  setManagingGame: Dispatch<SetStateAction<number | null>>
  needsRevisionUpdate: (
    lastRevision: number | undefined,
    version: string
  ) => boolean
  launchGame: (versionInfo: GameVersion) => Promise<void>
}

const GlobalCtx = createContext<GlobalCtxType | null>(null)

export const useGlobal = () => {
  const ctx = useContext(GlobalCtx)
  if (!ctx) throw new Error('useGlobal must be inside GlobalProvider')
  return ctx
}

export const GlobalProvider = ({
  children,
  value
}: {
  children: ReactNode
  value: GlobalCtxType
}) => {
  return <GlobalCtx.Provider value={value}>{children}</GlobalCtx.Provider>
}
