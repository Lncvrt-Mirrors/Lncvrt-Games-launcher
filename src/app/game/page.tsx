'use client'

import { useEffect } from 'react'
import '../Installs.css'
import { format } from 'date-fns'
import { invoke } from '@tauri-apps/api/core'
import { useGlobal } from '../GlobalProvider'
import { useSearchParams } from 'next/navigation'
import { platform } from '@tauri-apps/plugin-os'

export default function Installs () {
  const {
    downloadProgress,
    showPopup,
    setShowPopup,
    setPopupMode,
    setFadeOut,
    setSelectedVersionList,
    downloadedVersionsConfig,
    normalConfig,
    setManagingVersion,
    getVersionInfo,
    getVersionGame,
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
          className='button text-3xl'
          onClick={() => {
            setSelectedGame(Number(params.get('id') || 0))
            setPopupMode(0)
            setShowPopup(true)
            setFadeOut(false)
          }}
          disabled={downloadProgress.length != 0}
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
          {downloadedVersionsConfig && downloadedVersionsConfig.list.length ? (
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
                <div key={i} className='downloads-entry'>
                  <div className='flex flex-col'>
                    <p className='text-2xl'>
                      {getVersionGame(getVersionInfo(entry)?.game)?.name} v
                      {getVersionInfo(entry)?.versionName}
                    </p>
                    <div className='entry-info-item'>
                      <p>
                        Installed{' '}
                        {format(
                          new Date(downloadedVersionsConfig.timestamps[entry]),
                          'MM/dd/yyyy'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className='flex flex-row items-center gap-2'>
                    <button
                      className='button'
                      onClick={async () => {
                        setManagingVersion(entry)
                        setPopupMode(3)
                        setShowPopup(true)
                        setFadeOut(false)
                      }}
                    >
                      View Info
                    </button>
                    <button
                      className='button'
                      onClick={async () => {
                        setManagingVersion(entry)
                        setPopupMode(2)
                        setShowPopup(true)
                        setFadeOut(false)
                      }}
                    >
                      Manage
                    </button>
                    <button
                      className='button button-green'
                      onClick={async () => {
                        const verInfo = getVersionInfo(entry)
                        if (verInfo == undefined) return
                        invoke('launch_game', {
                          name: verInfo.id,
                          executable: verInfo.executable
                        })
                      }}
                    >
                      Launch
                    </button>
                  </div>
                </div>
              ))
          ) : (
            <div className='flex justify-center items-center h-full'>
              <p className='text-3xl'>No games installed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
