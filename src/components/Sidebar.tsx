'use client'

import '@/styles/sidebar.css'
import Icon from '@/assets/Icon.png'
import { openUrl } from '@tauri-apps/plugin-opener'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCog,
  faDownload,
  faGamepad,
  faHexagonNodes,
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { platform } from '@tauri-apps/plugin-os'
import { useGlobal } from '@/providers/GlobalProvider'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Lexend } from 'next/font/google'
import React from 'react'

const lexend = Lexend({
  subsets: ['latin']
})

export default function Sidebar () {
  const {
    serverVersionList,
    versionsList,
    setShowPopup,
    setPopupMode,
    setFadeOut,
    downloadProgress,
    category,
    setCategory,
    sidebarAlwaysShowGames,
    linuxUseWine
  } = useGlobal()

  const pathname = usePathname()
  const params = useSearchParams()
  const router = useRouter()

  return (
    <aside className='sidebar'>
      <div
        className='macos-drag'
        hidden={platform() != 'macos'}
        onMouseDown={e => {
          if (e.buttons === 1) {
            if (e.detail === 2) {
              getCurrentWindow().toggleMaximize()
            } else {
              getCurrentWindow().startDragging()
            }
          }
        }}
      ></div>
      <div
        className={
          'flex items-center h-10 w-60 ' +
          (platform() == 'windows' ? 'pl-1 pt-1' : 'pl-2 pt-2') +
          (platform() == 'macos' ? ' mt-7' : '')
        }
        onMouseDown={e => {
          if (platform() != 'macos') return
          if (e.buttons === 1) {
            if (e.detail === 2) {
              getCurrentWindow().toggleMaximize()
            } else {
              getCurrentWindow().startDragging()
            }
          }
        }}
      >
        <Image draggable={false} src={Icon} width={36} height={36} alt='' />
        <p className={`ml-1 text-[16px] whitespace-nowrap ${lexend.className}`}>
          Lncvrt Games Launcher
        </p>
      </div>
      <nav className='nav-links overflow-auto pt-2'>
        <Link
          draggable={false}
          href='/main'
          className={`link relative flex items-center ${
            pathname === '/main' || pathname.startsWith('/main/game')
              ? 'active'
              : ''
          }`}
        >
          <FontAwesomeIcon icon={faHexagonNodes} className='mr-2' /> Games
        </Link>
        {serverVersionList?.games
          .filter(g =>
            serverVersionList.versions
              .filter(v => v.game === g.id)
              .some(v => Object.keys(versionsList).includes(v.id))
          )
          .map(i => (
            <React.Fragment key={i.id}>
              <div
                draggable={false}
                className={`link ${
                  (pathname === '/main/game' &&
                    Number(params.get('id') || 0) == i.id) ||
                  (i.id == 1 &&
                    pathname === '/main/game/berrydash/leaderboards')
                    ? 'active'
                    : ''
                } ml-auto w-50 ${
                  sidebarAlwaysShowGames ||
                  pathname === '/' ||
                  pathname.startsWith('/main/game')
                    ? ''
                    : 'hidden'
                }`}
                onClick={() => {
                  setCategory(-1)
                  router.push('/main/game?id=' + i.id)
                }}
              >
                <div className='flex items-center'>
                  <FontAwesomeIcon
                    icon={
                      Object.entries(i.categoryNames).length > 0
                        ? faLayerGroup
                        : faGamepad
                    }
                    className='mr-1'
                  />
                  <span className='truncate max-w-full'>{i.name}</span>
                </div>
              </div>
              {Object.entries(i.categoryNames)
                .sort(([a], [b]) => Number(b) - Number(a))
                .filter(([key]) => {
                  const count = Object.keys(versionsList).filter(v => {
                    const info = serverVersionList.versions.find(
                      vf => vf.id == v
                    )
                    if (!info) return false

                    if (platform() == 'linux' && info.wine && !linuxUseWine)
                      return false

                    return info.game === i.id && info.category === Number(key)
                  }).length

                  return count >= 1
                })
                .map(([key, value]) => (
                  <div
                    key={`${i.id}-${key}`}
                    draggable={false}
                    className={`link ${
                      ((pathname === '/main/game' &&
                        Number(params.get('id') || 0) == i.id) ||
                        (i.id == 1 &&
                          pathname === '/main/game/berrydash/leaderboards')) &&
                      category == Number(key)
                        ? 'active'
                        : ''
                    } ml-auto w-47.5 ${
                      sidebarAlwaysShowGames ||
                      pathname === '/' ||
                      pathname.startsWith('/main/game')
                        ? ''
                        : 'hidden'
                    }`}
                    onClick={() => {
                      setCategory(Number(key))
                      router.push('/main/game?id=' + i.id)
                    }}
                  >
                    <div className='flex items-center'>
                      <FontAwesomeIcon icon={faGamepad} className='mr-1' />
                      <span className='truncate max-w-full'>{value}</span>
                    </div>
                  </div>
                ))}
            </React.Fragment>
          ))}
        <Link
          draggable={false}
          href='/main/settings'
          className={`link ${pathname === '/main/settings' ? 'active' : ''}`}
        >
          <FontAwesomeIcon icon={faCog} className='mr-1' /> Settings
        </Link>
        <button
          onClick={() => openUrl('https://games.lncvrt.xyz/discord')}
          className='link mr-auto'
        >
          <FontAwesomeIcon icon={faDiscord} className='mr-1' /> Community
        </button>
      </nav>
      <div
        className='sidebar-downloads'
        hidden={downloadProgress.length == 0}
        onClick={() => {
          setPopupMode(1)
          setShowPopup(true)
          setFadeOut(false)
        }}
      >
        <p>
          <FontAwesomeIcon icon={faDownload} /> Downloads
        </p>
      </div>
    </aside>
  )
}
