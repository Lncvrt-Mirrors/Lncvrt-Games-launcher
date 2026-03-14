'use client'

import { useEffect } from 'react'
import '@/app/Installs.css'
import { invoke } from '@tauri-apps/api/core'
import { useGlobal } from '@/app/GlobalProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { platform } from '@tauri-apps/plugin-os'
import { faWarning } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { ask } from '@tauri-apps/plugin-dialog'
import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs'
import { writeVersionsConfig } from '@/lib/BazookaManager'
import { openFolder } from '@/lib/Util'

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
    serverVersionList,
    category,
    setCategory,
    setDownloadedVersionsConfig,
    downloadVersions
  } = useGlobal()

  const params = useSearchParams()
  const router = useRouter()

  const id = Number(params.get('id') || 0)
  const game = serverVersionList?.games.find(g => g.id === id)

  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([])
  }, [normalConfig, setSelectedVersionList, showPopup])

  if (!id || !game) return <p>Invalid game</p>

  const needsRevisionUpdate = (
    lastRevision: number | undefined,
    version: string
  ) => {
    if (!lastRevision) return false
    return (
      lastRevision > 0 &&
      (downloadedVersionsConfig == undefined
        ? 0
        : downloadedVersionsConfig?.list[version]) /
        1000 <=
        lastRevision
    )
  }

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p
          className={`text-3xl truncate ${
            category != -1
              ? 'w-[calc(100vw-495px)]'
              : game.id == 1
              ? 'w-[calc(100vw-560px)]'
              : 'w-[calc(100vw-440px)]'
          }`}
        >
          {game.name} Installs
        </p>
        <div className='flex gap-2'>
          <button
            className='button btntheme1'
            onClick={() => {
              router.push('/game/berrydash/leaderboards')
            }}
            title='View the leaderboards for this game.'
            hidden={game.id != 1}
          >
            Leaderboards
          </button>
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
            platform() == 'windows'
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
                    platform() == 'linux' &&
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
                    key={key}
                    className={'downloads-entry'}
                    title={'Click to view category'}
                    onClick={() => setCategory(Number(key))}
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
                                  platform() == 'linux' &&
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
                  platform() == 'linux' &&
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
                  className={'downloads-entry'}
                  title={
                    'Click to launch game. Right-click to manage this version install'
                  }
                  onClick={async () => {
                    if (
                      needsRevisionUpdate(
                        getVersionInfo(entry)?.lastRevision,
                        entry
                      )
                    ) {
                      const answer = await ask(
                        'Before proceeding, if you do not want your installation directory wiped just yet, please backup the files to another directory. When you click "Yes", it will be wiped. Click "No" if you want to open the installation folder instead.',
                        {
                          title: 'Revision Update',
                          kind: 'warning'
                        }
                      )
                      if (answer) {
                        const answer2 = await ask(
                          'Are you sure you want to update? If you did not read the last popup, please go back and read it.',
                          {
                            title: 'Revision Update',
                            kind: 'warning'
                          }
                        )
                        if (!answer2) return

                        //open downloads popup
                        setPopupMode(1)
                        setShowPopup(true)
                        setFadeOut(false)

                        //uninstall
                        setDownloadedVersionsConfig(prev => {
                          if (!prev) return prev
                          const updatedList = Object.fromEntries(
                            Object.entries(prev.list).filter(
                              ([k]) => k !== entry
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
                          await exists('game/' + entry, {
                            baseDir: BaseDirectory.AppLocalData
                          })
                        )
                          await remove('game/' + entry, {
                            baseDir: BaseDirectory.AppLocalData,
                            recursive: true
                          })

                        //reinstall
                        setSelectedVersionList([entry])
                        downloadVersions([entry])
                      } else {
                        openFolder(entry)
                      }
                      return
                    }
                    const verInfo = getVersionInfo(entry)
                    if (verInfo == undefined) return
                    const gameInfo = getGameInfo(verInfo.game)
                    if (gameInfo == undefined) return
                    invoke('launch_game', {
                      name: verInfo.id,
                      executable: verInfo.executable,
                      displayName: verInfo.displayName,
                      useWine: !!(
                        platform() == 'linux' &&
                        verInfo.wine &&
                        normalConfig?.settings.useWineOnUnixWhenNeeded
                      ),
                      wineCommand: normalConfig?.settings.wineOnUnixCommand
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
                      {getVersionInfo(entry)?.displayName}{' '}
                    </p>

                    <div className='flex gap-2 absolute left-0 bottom-0'>
                      <div
                        className='entry-info-item'
                        title='The date the game was installed.'
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
                            platform() == 'linux' && getVersionInfo(entry)?.wine
                          ) ||
                          needsRevisionUpdate(
                            getVersionInfo(entry)?.lastRevision,
                            entry
                          )
                        }
                      >
                        <FontAwesomeIcon icon={faWarning} color='#ffc800' />
                        <p>Uses wine</p>
                      </div>
                      <div
                        className='entry-info-item'
                        hidden={
                          !needsRevisionUpdate(
                            getVersionInfo(entry)?.lastRevision,
                            entry
                          )
                        }
                      >
                        <FontAwesomeIcon icon={faWarning} color='#ffc800' />
                        <p>Needs revision update!</p>
                      </div>
                    </div>
                    <button
                      className='absolute right-0 bottom-0 button'
                      title='Click to manage mods for this game!'
                      onClick={e => e.stopPropagation()}
                      hidden={!getVersionInfo(entry)?.modSupportDownload}
                    >
                      Mod Manager
                    </button>
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
