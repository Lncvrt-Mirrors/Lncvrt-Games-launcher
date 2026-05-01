'use client'

import './Installs.css'
import { useEffect } from 'react'
import { useGlobal } from '@/providers/GlobalProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck,
  faShieldHalved,
  faWarning
} from '@fortawesome/free-solid-svg-icons'
import { platform } from '@tauri-apps/plugin-os'
import { useRouter } from 'next/navigation'

export default function Installs () {
  const {
    versionsList,
    serverVersionList,
    showPopup,
    setShowPopup,
    setPopupMode,
    setFadeOut,
    setSelectedVersionList,
    setSelectedGame,
    setCategory,
    setManagingGame
  } = useGlobal()

  const router = useRouter()

  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([])
  }, [setSelectedVersionList, showPopup])

  const filteredGames =
    serverVersionList?.games.filter(g =>
      serverVersionList.versions
        .filter(v => v.game === g.id)
        .some(v => Object.keys(versionsList).includes(v.id))
    ) ?? []

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Games</p>
        <button
          className='button btntheme1'
          onClick={() => {
            setSelectedGame(null)
            setPopupMode(0)
            setShowPopup(true)
            setFadeOut(false)
          }}
          title='Click to download more games.'
        >
          Download game
        </button>
      </div>
      <div className='downloads-container'>
        <div
          className={`downloads-scroll ${
            platform() == 'windows'
              ? 'h-[calc(100vh-116px)]'
              : 'h-[calc(100vh-84px)]'
          }`}
        >
          {filteredGames.length == 0 ? (
            <div className='flex justify-center items-center h-full'>
              <p className='text-3xl'>No games installed</p>
            </div>
          ) : (
            filteredGames.map(i => (
              <div
                key={i.id}
                className={'downloads-entry'}
                title={'Click to view game installs'}
                onClick={() => {
                  setCategory(-1)
                  router.push('/main/game?id=' + i.id)
                }}
                onContextMenu={e => {
                  e.preventDefault()
                  setManagingGame(i.id)
                  setPopupMode(5)
                  setShowPopup(true)
                  setFadeOut(false)
                }}
              >
                <div className='h-18 w-screen relative'>
                  <p className='text-2xl'>{i.name}</p>

                  <div className='flex gap-2 absolute left-0 bottom-0'>
                    <div
                      className='entry-info-item'
                      title='The amount of versions installed of this game in installed/installable format.'
                      onClick={e => e.stopPropagation()}
                    >
                      <p>
                        {(() => {
                          const gameVersions = (
                            serverVersionList?.versions ?? []
                          ).filter(v => v.game === i.id)
                          const installed = gameVersions.filter(v =>
                            Object.keys(versionsList).includes(v.id)
                          ).length
                          return gameVersions.length
                            ? `${installed}/${gameVersions.length}`
                            : 'N/A'
                        })()}{' '}
                        versions installed
                      </p>
                    </div>
                    <div
                      className='entry-info-item'
                      hidden={!i.official}
                      title='This game is official.'
                      onClick={e => e.stopPropagation()}
                    >
                      <FontAwesomeIcon icon={faCheck} color='#19c84b' />
                      <p>Official</p>
                    </div>
                    <div
                      className='entry-info-item'
                      hidden={i.official}
                      title={
                        i.verified
                          ? 'This game is verified to be safe'
                          : 'This game is not verified to be save. Proceed with caution.'
                      }
                      onClick={e => e.stopPropagation()}
                    >
                      <FontAwesomeIcon
                        icon={i.verified ? faShieldHalved : faWarning}
                        color={i.verified ? '#19c84b' : '#ffc800'}
                      />
                      <p>{i.verified ? 'Verified' : 'Unverified'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
