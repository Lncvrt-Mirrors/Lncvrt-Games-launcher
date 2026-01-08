'use client'

import { useEffect, useState } from 'react'
import '../Installs.css'
import { format } from 'date-fns'
import { invoke } from '@tauri-apps/api/core'
import { useGlobal } from '../GlobalProvider'
import { useSearchParams } from 'next/navigation'
import { platform } from '@tauri-apps/plugin-os'

export default function Installs () {
  const {
    showPopup,
    setShowPopup,
    setPopupMode,
    setFadeOut,
    setSelectedVersionList,
    downloadedVersionsConfig,
    normalConfig,
    setManagingVersion,
    getVersionInfo,
    getGameInfo,
    setSelectedGame
  } = useGlobal()

  const params = useSearchParams()

  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([])
  }, [normalConfig, setSelectedVersionList, showPopup])

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Installs</p>
        <button
          className='button btntheme1 text-3xl'
          onClick={() => {
            setSelectedGame(Number(params.get('id') || 0))
            setPopupMode(0)
            setShowPopup(true)
            setFadeOut(false)
          }}
          title='Click to download more versions of this game.'
        >
          Download versions
        </button>
      </div>
      <div className='downloads-container'>
        <div
          className={`downloads-scroll ${
            platform() === 'windows'
              ? 'h-[calc(100vh-116px)]'
              : 'h-[calc(100vh-84px)]'
          }`}
        >
          {downloadedVersionsConfig &&
          downloadedVersionsConfig.list.filter(v => {
            const info = getVersionInfo(v)
            if (!info) return false
            return info.game === Number(params.get('id') || 0)
          }).length != 0 ? (
            downloadedVersionsConfig.list
              .sort((a, b) => {
                const infoA = getVersionInfo(a)
                const infoB = getVersionInfo(b)
                if (!infoA || !infoB) return -1
                return infoB.place - infoA.place
              })
              .filter(v => {
                const info = getVersionInfo(v)
                if (!info) return false
                return info.game === Number(params.get('id') || 0)
              })
              .map((entry, i) => (
                <div
                  key={entry}
                  className={`downloads-entry ${
                    normalConfig?.settings.useLegacyInteractButtons
                      ? ''
                      : 'cursor-pointer'
                  }`}
                  title={
                    normalConfig?.settings.useLegacyInteractButtons
                      ? ''
                      : 'Click to launch game. Right-click to manage this version install'
                  }
                  onClick={async () => {
                    if (normalConfig?.settings.useLegacyInteractButtons) return
                    const verInfo = getVersionInfo(entry)
                    if (verInfo == undefined) return
                    const gameInfo = getGameInfo(verInfo.game)
                    if (gameInfo == undefined) return
                    invoke('launch_game', {
                      name: verInfo.id,
                      executable: verInfo.executable,
                      displayName: `${gameInfo.name} v${verInfo.versionName}`
                    })
                  }}
                  onContextMenu={e => {
                    e.preventDefault()
                    setManagingVersion(entry)
                    setPopupMode(2)
                    setShowPopup(true)
                    setFadeOut(false)
                  }}
                >
                  <div className='h-18 w-screen relative'>
                    <p className='text-2xl'>
                      {getGameInfo(getVersionInfo(entry)?.game)?.name} v
                      {getVersionInfo(entry)?.versionName}
                    </p>

                    <div
                      className='entry-info-item absolute left-0 bottom-0'
                      title='The date the game was installed in MM/dd/yyyy format'
                    >
                      <p>
                        Installed{' '}
                        {format(
                          new Date(downloadedVersionsConfig.timestamps[entry]),
                          'MM/dd/yyyy'
                        )}
                      </p>
                    </div>

                    <div className='flex gap-2 absolute right-0 bottom-0'>
                      <button
                        className='button'
                        onClick={e => {
                          e.stopPropagation()
                          setManagingVersion(entry)
                          setPopupMode(3)
                          setShowPopup(true)
                          setFadeOut(false)
                        }}
                        title='Click to view version info'
                      >
                        View Info
                      </button>
                      <button
                        className='button'
                        hidden={
                          !normalConfig?.settings.useLegacyInteractButtons
                        }
                        onClick={e => {
                          e.stopPropagation()
                          setManagingVersion(entry)
                          setPopupMode(2)
                          setShowPopup(true)
                          setFadeOut(false)
                        }}
                        title='Click to manage this version install'
                      >
                        Manage
                      </button>
                      <button
                        className='button'
                        onClick={e => {
                          e.stopPropagation()
                          const verInfo = getVersionInfo(entry)
                          if (verInfo == undefined) return
                          invoke('launch_game', {
                            name: verInfo.id,
                            executable: verInfo.executable
                          })
                        }}
                        hidden={
                          !normalConfig?.settings.useLegacyInteractButtons
                        }
                        title='Click to launch game'
                      >
                        Launch
                      </button>
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className='flex justify-center items-center h-full'>
              <p className='text-3xl'>No versions installed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
