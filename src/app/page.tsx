'use client'

import { useEffect, useState } from 'react'
import './Installs.css'
import { useGlobal } from './GlobalProvider'
import Link from 'next/link'
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
    showPopup,
    setShowPopup,
    setPopupMode,
    setFadeOut,
    setSelectedVersionList,
    downloadedVersionsConfig,
    normalConfig,
    setSelectedGame,
    getListOfGames,
    getVersionsAmountData
  } = useGlobal()

  const router = useRouter()

  useEffect(() => {
    if (!showPopup) return
    setSelectedVersionList([])
  }, [normalConfig, setSelectedVersionList, showPopup])

  return (
    <div className='mx-4 mt-4'>
      <div className='flex justify-between items-center mb-4'>
        <p className='text-3xl'>Games</p>
        <button
          className='button btntheme1 text-3xl'
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
            platform() === 'windows'
              ? 'h-[calc(100vh-116px)]'
              : 'h-[calc(100vh-84px)]'
          }`}
        >
          {downloadedVersionsConfig && downloadedVersionsConfig.list.length ? (
            getListOfGames()
              .sort((a, b) => {
                return a.id - b.id
              })
              .map(i => (
                <div
                  key={i.id}
                  className={`downloads-entry ${
                    normalConfig?.settings.useLegacyInteractButtons
                      ? ''
                      : 'cursor-pointer'
                  }`}
                  title={
                    normalConfig?.settings.useLegacyInteractButtons
                      ? ''
                      : 'Click to view game installs'
                  }
                  onClick={() => {
                    if (normalConfig?.settings.useLegacyInteractButtons) return
                    router.push('/game?id=' + i.id)
                  }}
                >
                  <div className='h-18 w-screen relative'>
                    <p className='text-2xl'>{i.name}</p>

                    <div className='flex gap-2 absolute left-0 bottom-0'>
                      <div
                        className='entry-info-item'
                        title='The amount of versions installed of this game in installed/installable format.'
                      >
                        <p>
                          {(() => {
                            const data = getVersionsAmountData(i.id)
                            if (!data) return 'N/A'
                            return `${data.installed}/${data.total}`
                          })()}{' '}
                          versions installed
                        </p>
                      </div>
                      <div
                        className='entry-info-item'
                        hidden={!i.official}
                        title='This game is official.'
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
                      >
                        <FontAwesomeIcon
                          icon={i.verified ? faShieldHalved : faWarning}
                          color={i.verified ? '#19c84b' : '#ffc800'}
                        />
                        <p>{i.verified ? 'Verified' : 'Unverified'}</p>
                      </div>
                    </div>

                    <Link
                      className='button absolute right-0 bottom-0'
                      href={'/game?id=' + i.id}
                      hidden={!normalConfig?.settings.useLegacyInteractButtons}
                      title='Click to view game installs'
                    >
                      Installs
                    </Link>
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
