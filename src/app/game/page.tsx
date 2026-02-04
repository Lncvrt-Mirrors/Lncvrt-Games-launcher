'use client'

import { useEffect, useState } from 'react'
import '../Installs.css'
import { invoke } from '@tauri-apps/api/core'
import { useGlobal } from '../GlobalProvider'
import { useSearchParams } from 'next/navigation'
import { platform } from '@tauri-apps/plugin-os'
import { faWarning } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

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
    setSelectedGame,
    serverVersionList
  } = useGlobal()

  const params = useSearchParams()

  const id = Number(params.get('id') || 0)
  const game = serverVersionList?.games.find(g => g.id === id)

  const [category, setCategory] = useState<number>(-1)
  const [lastId, setLastId] = useState(id)

  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([])
  }, [normalConfig, setSelectedVersionList, showPopup])

  if (!id || !game) return <p>Invalid game</p>

  if (lastId !== id) {
    setLastId(id)
    setCategory(-1)
  }

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Installs</p>
        <div className='flex gap-2'>
          <button
            className='button btntheme1'
            onClick={() => {
              setCategory(-1)
            }}
            title='Click to go up a level.'
            hidden={category == -1}
          >
            Back
          </button>
          <button
            className='button btntheme1'
            onClick={() => {
              setSelectedGame(id)
              setPopupMode(0)
              setShowPopup(true)
              setFadeOut(false)
            }}
            title='Click to download more versions of this game.'
          >
            Download versions
          </button>
        </div>
      </div>
      <div className='downloads-container'>
        <div
          className={`downloads-scroll ${
            platform() === 'windows'
              ? 'h-[calc(100vh-116px)]'
              : 'h-[calc(100vh-84px)]'
          }`}
        >
          {category == -1 &&
            Object.entries(game.categoryNames)
              .sort(([a], [b]) => Number(b) - Number(a))
              .filter(([key]) => {
                const count = Object.keys(
                  downloadedVersionsConfig?.list ?? {}
                ).filter(v => {
                  const info = getVersionInfo(v)
                  if (!info) return false

                  if (
                    platform() === 'linux' &&
                    info.wine &&
                    !normalConfig?.settings.useWineOnUnixWhenNeeded
                  )
                    return false

                  return info.game === id && info.category === Number(key)
                }).length

                return count >= 1
              })
              .map(([key, value]) => {
                return (
                  <div
                    key={value}
                    className={`downloads-entry ${
                      normalConfig?.settings.useLegacyInteractButtons
                        ? ''
                        : 'cursor-pointer'
                    }`}
                    title={
                      normalConfig?.settings.useLegacyInteractButtons
                        ? ''
                        : 'Click to view category'
                    }
                    onClick={() => {
                      if (normalConfig?.settings.useLegacyInteractButtons)
                        return
                      setCategory(Number(key))
                    }}
                  >
                    <div className='h-18 w-screen relative'>
                      <p className='text-2xl'>{value}</p>

                      <div
                        className='entry-info-item flex absolute left-0 bottom-0'
                        title='The amount of versions installed of this game in installed/installable format.'
                        onClick={e => e.stopPropagation()}
                      >
                        <p>
                          {(() => {
                            const count =
                              Object.keys(
                                downloadedVersionsConfig?.list ?? []
                              ).filter(v => {
                                const info = getVersionInfo(v)
                                if (!info) return false
                                if (
                                  platform() === 'linux' &&
                                  info.wine &&
                                  !normalConfig?.settings
                                    .useWineOnUnixWhenNeeded
                                )
                                  return false
                                return (
                                  info.game === id &&
                                  info.category == Number(key)
                                )
                              }).length ?? 0
                            return `${count} install${count === 1 ? '' : 's'}`
                          })()}
                        </p>
                      </div>

                      <button
                        className='button absolute right-0 bottom-0'
                        hidden={
                          !normalConfig?.settings.useLegacyInteractButtons
                        }
                        title='Click to view category'
                        onClick={() => setCategory(Number(key))}
                      >
                        Installs
                      </button>
                    </div>
                  </div>
                )
              })}
          {Object.keys(downloadedVersionsConfig?.list ?? []).filter(v => {
            const info = getVersionInfo(v)
            if (!info) return false
            return info.game === id
          }).length != 0 ? (
            Object.keys(downloadedVersionsConfig?.list ?? [])
              .sort((a, b) => {
                const infoA = getVersionInfo(a)
                const infoB = getVersionInfo(b)
                if (!infoA || !infoB) return -1
                return infoB.place - infoA.place
              })
              .filter(v => {
                const info = getVersionInfo(v)
                if (!info) return false
                if (
                  platform() === 'linux' &&
                  info.wine &&
                  !normalConfig?.settings.useWineOnUnixWhenNeeded
                )
                  return false
                return (
                  info.game === id &&
                  (category == -1
                    ? info.category == -1
                    : info.category == category)
                )
              })
              .map(entry => (
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
                      displayName: verInfo.displayName,
                      useWine: !!(
                        platform() === 'linux' &&
                        verInfo.wine &&
                        normalConfig?.settings.useWineOnUnixWhenNeeded
                      ),
                      wineCommand: normalConfig?.settings.wineOnUnixCommand
                    })
                  }}
                  onContextMenu={e => {
                    e.preventDefault()
                    if (normalConfig?.settings.useLegacyInteractButtons) return

                    setManagingVersion(entry)
                    setPopupMode(2)
                    setShowPopup(true)
                    setFadeOut(false)
                  }}
                >
                  <div className='h-18 w-screen relative'>
                    <p className='text-2xl'>
                      {getVersionInfo(entry)?.displayName}
                    </p>

                    <div className='flex gap-2 absolute left-0 bottom-0'>
                      <div
                        className='entry-info-item'
                        title='The date the game was installed.'
                        onClick={e => e.stopPropagation()}
                      >
                        <p>
                          Installed{' '}
                          {new Intl.DateTimeFormat(undefined).format(
                            downloadedVersionsConfig?.list[entry]
                          )}
                        </p>
                      </div>
                      <div
                        className='entry-info-item'
                        title='This version is using wine. It cannot be guarenteed to work fully and might not work at all.'
                        hidden={
                          !(
                            platform() === 'linux' &&
                            getVersionInfo(entry)?.wine
                          )
                        }
                        onClick={e => e.stopPropagation()}
                      >
                        <FontAwesomeIcon icon={faWarning} color='#ffc800' />
                        <p>Uses wine</p>
                      </div>
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
                          const gameInfo = getGameInfo(verInfo.game)
                          if (gameInfo == undefined) return
                          invoke('launch_game', {
                            name: verInfo.id,
                            executable: verInfo.executable,
                            displayName: verInfo.displayName,
                            useWine: !!(
                              platform() === 'linux' &&
                              verInfo.wine &&
                              normalConfig?.settings.useWineOnUnixWhenNeeded
                            ),
                            wineCommand:
                              normalConfig?.settings.wineOnUnixCommand
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
