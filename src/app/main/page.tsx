'use client'

import { useGlobal } from '@/providers/GlobalProvider'
import 'swiper/css'
import { Swiper, SwiperSlide } from 'swiper/react'
import { formatDistanceToNow } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEllipsis, faPlay } from '@fortawesome/free-solid-svg-icons'

export default function HomePage () {
  const {
    launchesList,
    serverVersionList,
    accountName,
    launchGame,
    setManagingVersion,
    setPopupMode,
    setShowPopup,
    setFadeOut
  } = useGlobal()

  const filteredLaunchesList = Object.fromEntries(
    Object.entries(launchesList)
      .flatMap(([gameId, launches]) => {
        const entries = Object.entries(launches)

        if (entries.length === 0) return []

        const [version, timestamp] = entries.reduce((latest, current) =>
          current[1] > latest[1] ? current : latest
        )

        return [[`${gameId}-${version}`, timestamp] as const]
      })
      .sort((a, b) => b[1] - a[1])
  )

  return (
    <div className='mx-4 mt-4'>
      <div className='flex flex-col gap-1 mb-4'>
        <p className='text-3xl'>Home</p>
        <p className='text-gray-300'>Welcome back, {accountName ?? 'User'}!</p>
      </div>
      <div>
        <p className='text-2xl'>Jump back in</p>
        {Object.entries(filteredLaunchesList).length == 0 ? (
          <p className='text-gray-300'>You have no recently launched games</p>
        ) : (
          <Swiper spaceBetween={16} slidesPerView={2}>
            {Object.entries(filteredLaunchesList).map(([key, timestamp]) => {
              const versionInfo = serverVersionList?.versions.find(
                v => v.id == key.split('-').slice(1).join('-')
              )
              if (!versionInfo) return

              return (
                <SwiperSlide
                  key={key}
                  className='flex flex-col gap-2 bg-(--col1) border border-(--col3) rounded-lg px-3 py-2'
                >
                  <p className='truncate text-2xl'>
                    {versionInfo?.displayName}
                  </p>
                  <p className='truncate text-gray-300'>
                    Last played{' '}
                    {formatDistanceToNow(new Date(timestamp), {
                      addSuffix: true
                    })}
                  </p>
                  <div className='flex flex-row gap-2 my-1'>
                    <FontAwesomeIcon
                      icon={faPlay}
                      className='button btntheme1'
                      onClick={async () => await launchGame(versionInfo)}
                    />
                    <FontAwesomeIcon
                      icon={faEllipsis}
                      className='button btntheme1'
                      onClick={() => {
                        setManagingVersion(versionInfo.id)
                        setPopupMode(2)
                        setShowPopup(true)
                        setFadeOut(false)
                      }}
                    />
                  </div>
                </SwiperSlide>
              )
            })}
          </Swiper>
        )}
      </div>
    </div>
  )
}
