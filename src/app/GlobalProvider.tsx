'use client'

import {
  createContext,
  useContext,
  ReactNode,
  Dispatch,
  SetStateAction
} from 'react'
import { DownloadProgress } from '@/types/DownloadProgress'
import { VersionsConfig } from '@/types/VersionsConfig'
import { NormalConfig } from '@/types/NormalConfig'
import { ServerVersionsResponse } from '@/types/ServerVersionsResponse'
import { GameVersion } from '@/types/GameVersion'
import { Game } from '@/types/Game'
import { Mod } from '@/types/Mod'

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
  downloadedVersionsConfig: VersionsConfig | null
  setDownloadedVersionsConfig: Dispatch<SetStateAction<VersionsConfig | null>>
  normalConfig: NormalConfig | null
  setNormalConfig: Dispatch<SetStateAction<NormalConfig | null>>
  managingVersion: string | null
  setManagingVersion: Dispatch<SetStateAction<string | null>>
  setSelectedGame: Dispatch<SetStateAction<number | null>>
  getVersionInfo: (id: string | undefined) => GameVersion | undefined
  getGameInfo: (game: number | undefined) => Game | undefined
  getListOfGames(): Game[]
  getVersionsAmountData: (gameId: number) => {
    installed: number
    total: number
  } | null
  viewingInfoFromDownloads: boolean
  version: string | null
  downloadVersions: (
    list: Array<{ id: string; type: 0 | 1 | 2 }>
  ) => Promise<void>
  category: number
  setCategory: Dispatch<SetStateAction<number>>
  downloadQueue: string[]
  setDownloadQueue: Dispatch<SetStateAction<string[]>>
  closePopup: () => void
  getSpecialVersionsList(game?: number | undefined): GameVersion[]
  selectedGame: number | null
  setViewingInfoFromDownloads: Dispatch<SetStateAction<boolean>>
  showModInfo: Mod | null
  setShowModInfo: Dispatch<SetStateAction<Mod | null>>
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
