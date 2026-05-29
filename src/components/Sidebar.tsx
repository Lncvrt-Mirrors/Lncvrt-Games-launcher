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
  faLayerGroup,
  faUser,
  faUserShield
} from '@fortawesome/free-solid-svg-icons'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { platform } from '@tauri-apps/plugin-os'
import { useGlobal } from '@/providers/GlobalProvider'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Lexend } from 'next/font/google'
import React, { useState } from 'react'
import { message } from '@tauri-apps/plugin-dialog'

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
    linuxUseWine,
    setManagingGame,
    settings,
    developerMode,
    accountName,
    accountAdmin
  } = useGlobal()

  const pathname = usePathname()
  const params = useSearchParams()
  const router = useRouter()

  const [devModeClicks, setDevModeClicks] = useState<number>(0)

  return (
    <aside className='sidebar'>
      {platform() == 'macos' && (
        <div
          className='macos-drag'
          onMouseDown={async e => {
            if (e.buttons === 1) {
              if (e.detail === 2) {
                await getCurrentWindow().toggleMaximize()
              } else {
                await getCurrentWindow().startDragging()
              }
            }
          }}
        />
      )}
      <div
        className={
          'flex items-center h-10 w-60 ' +
          (platform() == 'windows' ? 'pl-1 pt-1' : 'pl-2 pt-2') +
          (platform() == 'macos' ? ' mt-5' : '')
        }
        onMouseDown={async e => {
          if (platform() != 'macos') return
          if (e.buttons === 1) {
            if (e.detail === 2) {
              await getCurrentWindow().toggleMaximize()
            } else {
              await getCurrentWindow().startDragging()
            }
          }
        }}
      >
        <Image draggable={false} src={Icon} width={36} height={36} alt='' />
        <p className={`ml-1 text-[16px] whitespace-nowrap ${lexend.className}`}>
          Lncvrt Games Launcher
        </p>
      </div>
      <nav className='nav-links overflow-auto'>
        <Link
          draggable={false}
          href='/main'
          className={`link relative flex items-center ${
            pathname === '/main' || pathname.startsWith('/main/game')
              ? 'active'
              : ''
          }`}
          onContextMenu={async e => {
            e.preventDefault()

            if (developerMode) {
              await settings?.set('developerMode', false)
              await message(
                'Developer mode disabled! You can enable it again by right clicking the games button 3 times again.',
                { title: 'Developer mode off', kind: 'info' }
              )
              return
            }

            if (devModeClicks == 2) {
              await settings?.set('developerMode', true)
              setDevModeClicks(0)
              await message(
                'Developer mode sucessfully enabled! You can disable it by right clicking the games button again.',
                { title: 'Developer mode on', kind: 'info' }
              )
            } else {
              setDevModeClicks(devModeClicks + 1)
            }
          }}
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
                  pathname === '/main/game' &&
                  Number(params.get('id') || 0) == i.id
                    ? 'active'
                    : ''
                } ml-auto w-50 ${
                  sidebarAlwaysShowGames ||
                  pathname === '/main' ||
                  pathname.startsWith('/main/game')
                    ? ''
                    : 'hidden'
                }`}
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
                title='Click to view game installs.'
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
                      pathname === '/main/game' &&
                      Number(params.get('id') || 0) == i.id &&
                      category == Number(key)
                        ? 'active'
                        : ''
                    } ml-auto w-47.5 ${
                      sidebarAlwaysShowGames ||
                      pathname === '/main' ||
                      pathname.startsWith('/main/game')
                        ? ''
                        : 'hidden'
                    }`}
                    onClick={() => {
                      setCategory(Number(key))
                      router.push('/main/game?id=' + i.id)
                    }}
                    title="Click to view this game's category."
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
        <Link
          draggable={false}
          href='/main/account'
          className={`link ${pathname === '/main/account' ? 'active' : ''}`}
        >
          <FontAwesomeIcon
            icon={accountAdmin ? faUserShield : faUser}
            className='mr-1'
          />{' '}
          {accountName ?? 'Account'}
        </Link>
        <button
          onClick={() => openUrl('https://games.lncvrt.xyz/discord')}
          className='link mr-auto'
        >
          <FontAwesomeIcon icon={faDiscord} className='mr-1' /> Community
        </button>
      </nav>
      {downloadProgress.length != 0 && (
        <div
          className='sidebar-downloads'
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
      )}
    </aside>
  )
}
