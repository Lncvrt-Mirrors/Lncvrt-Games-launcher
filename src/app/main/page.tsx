'use client'

import { useGlobal } from '@/providers/GlobalProvider'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { Swiper as SwiperType } from 'swiper'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import { formatDistanceToNow } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft,
  faChevronRight,
  faEllipsis,
  faPlay
} from '@fortawesome/free-solid-svg-icons'
import { useRef } from 'react'

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

  const swiperRef = useRef<SwiperType | null>(null)
  const prevRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

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
          <div className='flex flex-col items-center gap-2'>
            <Swiper
              modules={[Navigation]}
              spaceBetween={16}
              slidesPerView={2}
              autoHeight={false}
              className='w-full'
              onSwiper={swiper => {
                swiperRef.current = swiper
              }}
              onBeforeInit={swiper => {
                if (
                  swiper.params.navigation &&
                  typeof swiper.params.navigation !== 'boolean'
                ) {
                  swiper.params.navigation.prevEl = prevRef.current
                  swiper.params.navigation.nextEl = nextRef.current
                }
              }}
            >
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
            <div className='flex flex-row gap-2'>
              <button
                ref={prevRef}
                onClick={() => swiperRef.current?.slidePrev()}
                className='button btntheme1 w-8 h-8 flex justify-center items-center'
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <button
                ref={nextRef}
                onClick={() => swiperRef.current?.slideNext()}
                className='button btntheme1 w-8 h-8 flex justify-center items-center'
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
