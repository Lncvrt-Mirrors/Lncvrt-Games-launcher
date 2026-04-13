'use client'

import '../Installs.css'
import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useGlobal } from '@/providers/GlobalProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { platform } from '@tauri-apps/plugin-os'
import { faWarning } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { ask } from '@tauri-apps/plugin-dialog'
import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs'
import { openFolder } from '@/lib/util'

export default function Installs () {
  const {
    versionsList,
    serverVersionList,
    showPopup,
    setShowPopup,
    setPopupMode,
    setFadeOut,
    setSelectedVersionList,
    setManagingVersion,
    setSelectedGame,
    category,
    setCategory,
    downloadVersions,
    downloadProgress,
    linuxUseWine,
    linuxWineCommand,
    versions
  } = useGlobal()

  const params = useSearchParams()
  const router = useRouter()

  const id = Number(params.get('id') || 0)
  const game = serverVersionList?.games.find(g => g.id === id)

  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([])
  }, [setSelectedVersionList, showPopup])

  if (!id || !game) return <p>Invalid game</p>

  const needsRevisionUpdate = (
    lastRevision: number | undefined,
    version: string
  ) => {
    if (!lastRevision) return false
    return (
      lastRevision > 0 &&
      (versionsList == undefined ? 0 : versionsList[version]) / 1000 <=
        lastRevision
    )
  }

  const filteredVersions = Object.keys(versionsList).filter(v => {
    const info = serverVersionList?.versions.find(vf => vf.id == v)
    if (!info) return false
    if (platform() == 'linux' && info.wine && !linuxUseWine) return false
    return (
      info.game === id &&
      (category == -1 ? info.category == -1 : info.category == category)
    )
  })

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p
          className={`text-3xl truncate ${
            category != -1
              ? 'w-[calc(100vw-495px)]'
              : game.id == 1 || game.id == 9
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
              router.push('/main/game/berrydash/leaderboards')
            }}
            title='View the leaderboards for this game.'
            hidden={game.id != 1}
          >
            Leaderboards
          </button>
          <button
            className='button btntheme1'
            onClick={() =>
              invoke('open_new_window', {
                title: 'XPS Dashboard',
                name: 'xpsdashboard',
                url: 'https://xps.lncvrt.xyz/dashboard/',
                width: 1280,
                height: 720
              })
            }
            title='Open the GDPS Dashboard!'
            hidden={game.id != 9 || category != -1}
          >
            Dashboard
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
              .filter(([key]) => {
                const count = Object.keys(versionsList).filter(v => {
                  const info = serverVersionList?.versions.find(
                    vf => vf.id == v
                  )
                  if (!info) return false

                  if (platform() == 'linux' && info.wine && !linuxUseWine)
                    return false

                  return info.game === id && info.category === Number(key)
                }).length

                return count >= 1
              })
              .sort(([a], [b]) => Number(b) - Number(a))
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
                              Object.keys(versionsList).filter(v => {
                                const info = serverVersionList?.versions.find(
                                  vf => vf.id == v
                                )
                                if (!info) return false
                                if (
                                  platform() == 'linux' &&
                                  info.wine &&
                                  !linuxUseWine
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
          {filteredVersions.length === 0 &&
            (category !== -1 ||
              Object.keys(versionsList).filter(v => {
                const info = serverVersionList?.versions.find(vf => vf.id == v)
                if (!info) return false

                if (platform() == 'linux' && info.wine && !linuxUseWine)
                  return false

                return info.game === id
              }).length === 0) && (
              <div className='flex justify-center items-center h-full'>
                <p className='text-3xl'>No versions installed</p>
              </div>
            )}
          {filteredVersions
            .sort((a, b) => {
              const infoA = serverVersionList?.versions.find(vf => vf.id == a)
              const infoB = serverVersionList?.versions.find(vf => vf.id == b)
              if (!infoA || !infoB) return 0
              return infoB.place - infoA.place
            })
            .map(v => {
              const versionInfo = serverVersionList?.versions.find(
                vf => vf.id == v
              )
              if (!versionInfo) return

              return (
                <div
                  key={v}
                  className={'downloads-entry'}
                  title={
                    'Click to launch game. Right-click to manage this version install'
                  }
                  onClick={async () => {
                    if (needsRevisionUpdate(versionInfo.lastRevision, v)) {
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
                        versions?.set(
                          'list',
                          Object.fromEntries(
                            Object.entries(versionsList).filter(
                              ([k]) => k !== v
                            )
                          )
                        )

                        if (
                          await exists('game/' + v, {
                            baseDir: BaseDirectory.AppLocalData
                          })
                        )
                          await remove('game/' + v, {
                            baseDir: BaseDirectory.AppLocalData,
                            recursive: true
                          })

                        //reinstall
                        setSelectedVersionList([v])
                        downloadVersions([
                          {
                            id: v,
                            type: 0
                          }
                        ])
                      } else {
                        openFolder(v)
                      }
                      return
                    }
                    invoke('launch_game', {
                      name: versionInfo.id,
                      executable: versionInfo.executable,
                      displayName: versionInfo.displayName,
                      useWine: !!(
                        platform() == 'linux' &&
                        versionInfo.wine &&
                        linuxUseWine
                      ),
                      wineCommand: linuxWineCommand
                    })
                  }}
                  onContextMenu={e => {
                    e.preventDefault()
                    setManagingVersion(v)
                    setPopupMode(2)
                    setShowPopup(true)
                    setFadeOut(false)
                  }}
                >
                  <div className='h-18 w-screen relative'>
                    <p className='text-2xl'>{versionInfo.displayName}</p>

                    <div className='flex gap-2 absolute left-0 bottom-0'>
                      <div
                        className='entry-info-item'
                        title='The date the game was installed.'
                      >
                        <p>
                          Installed{' '}
                          {new Intl.DateTimeFormat(undefined).format(
                            versionsList[v]
                          )}
                        </p>
                      </div>
                      <div
                        className='entry-info-item'
                        title='This version is using wine. It cannot be guarenteed to work fully and might not work at all.'
                        hidden={
                          !(platform() == 'linux' && versionInfo.wine) ||
                          needsRevisionUpdate(versionInfo.lastRevision, v)
                        }
                      >
                        <FontAwesomeIcon icon={faWarning} color='#ffc800' />
                        <p>Uses wine</p>
                      </div>
                      <div
                        className='entry-info-item'
                        hidden={
                          !needsRevisionUpdate(versionInfo.lastRevision, v)
                        }
                      >
                        <FontAwesomeIcon icon={faWarning} color='#ffc800' />
                        <p>Needs revision update!</p>
                      </div>
                    </div>
                    <button
                      className='absolute right-0 bottom-0 button'
                      title='Click to manage mods for this game!'
                      onClick={async e => {
                        e.stopPropagation()

                        if (
                          !(await exists('game/' + v + '/BepInEx', {
                            baseDir: BaseDirectory.AppLocalData
                          }))
                        ) {
                          if (
                            (await ask(
                              "You don't have BepInEx (the mod loader for Unity Games), would you like to install it now? It is about 1MB in size. If you choose yes, it will download the recommended BepInEx version for " +
                                versionInfo.displayName +
                                '.',
                              { title: 'BepInEx not found!', kind: 'error' }
                            )) &&
                            !downloadProgress.find(d => d.version == v)
                          ) {
                            downloadVersions([
                              {
                                id: v,
                                type: 1
                              }
                            ])
                          }
                          return
                        }
                        setManagingVersion(v)
                        setPopupMode(3)
                        setShowPopup(true)
                        setFadeOut(false)
                      }}
                      hidden={!versionInfo.modSupportDownload}
                    >
                      Mod Manager
                    </button>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
