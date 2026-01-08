'use client'

import { createContext, useContext, ReactNode } from 'react'
import { DownloadProgress } from './types/DownloadProgress'
import { VersionsConfig } from './types/VersionsConfig'
import { NormalConfig } from './types/NormalConfig'
import { ServerVersionsResponse } from './types/ServerVersionsResponse'
import { GameVersion } from './types/GameVersion'
import { Game } from './types/Game'

type GlobalCtxType = {
  serverVersionList: ServerVersionsResponse | null
  selectedVersionList: string[]
  setSelectedVersionList: (v: string[]) => void
  downloadProgress: DownloadProgress[]
  setDownloadProgress: (v: DownloadProgress[]) => void
  showPopup: boolean
  setShowPopup: (v: boolean) => void
  popupMode: number | null
  setPopupMode: (v: number | null) => void
  fadeOut: boolean
  setFadeOut: (v: boolean) => void
  downloadedVersionsConfig: VersionsConfig | null
  setDownloadedVersionsConfig: (v: VersionsConfig | null) => void
  normalConfig: NormalConfig | null
  setNormalConfig: (v: NormalConfig | null) => void
  managingVersion: string | null
  setManagingVersion: (v: string | null) => void
  setSelectedGame: (v: number | null) => void
  getVersionInfo: (id: string | undefined) => GameVersion | undefined
  getGameInfo: (id: number | undefined) => Game | undefined
  getListOfGames: () => Game[]
  getVersionsAmountData: (gameId: number) => {
    installed: number
    total: number
  } | null
  viewingInfoFromDownloads: boolean
  version: string | null
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
