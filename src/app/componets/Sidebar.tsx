'use client'

import './Sidebar.css'
import Icon from '@/assets/Icon.png'
import { openUrl } from '@tauri-apps/plugin-opener'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCog,
  faDownload,
  faGamepad,
  faHexagonNodes
} from '@fortawesome/free-solid-svg-icons'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { platform } from '@tauri-apps/plugin-os'
import { useGlobal } from '../GlobalProvider'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Lexend } from 'next/font/google'

const lexend = Lexend({
  subsets: ['latin']
})

export default function Sidebar () {
  const {
    normalConfig,
    getListOfGames,
    setShowPopup,
    setPopupMode,
    setFadeOut,
    downloadProgress
  } = useGlobal()

  const pathname = usePathname()
  const params = useSearchParams()

  return (
    <aside className='sidebar'>
      <div
        className='macos-drag'
        hidden={platform() != 'macos'}
        onMouseDown={e => {
          if (e.buttons === 1) {
            e.detail === 2
              ? getCurrentWindow().toggleMaximize()
              : getCurrentWindow().startDragging()
          }
        }}
      ></div>
      <div
        className='logo'
        style={{
          marginTop:
            platform() == 'windows'
              ? '32px'
              : platform() == 'macos'
              ? '28px'
              : ''
        }}
        onMouseDown={e => {
          if (platform() != 'macos') return
          if (e.buttons === 1) {
            e.detail === 2
              ? getCurrentWindow().toggleMaximize()
              : getCurrentWindow().startDragging()
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
          href='/'
          className={`link relative flex items-center ${
            pathname === '/' || pathname === '/game' ? 'active' : ''
          }`}
        >
          <FontAwesomeIcon icon={faHexagonNodes} className='mr-2' /> Games
        </Link>
        {getListOfGames()
          .sort((a, b) => {
            return a.id - b.id
          })
          .map(i => (
            <Link
              key={i.id}
              draggable={false}
              href={'/game?id=' + i.id}
              className={`link ${
                pathname === '/game' && Number(params.get('id') || 0) == i.id
                  ? 'active'
                  : ''
              } ml-auto w-50 ${
                normalConfig?.settings.alwaysShowGamesInSidebar ||
                pathname === '/' ||
                pathname === '/game'
                  ? ''
                  : 'hidden'
              }`}
            >
              <div className='flex items-center'>
                <FontAwesomeIcon icon={faGamepad} className='mr-1' />
                <span className='truncate max-w-full'>{i.name}</span>
              </div>
            </Link>
          ))}
        <Link
          draggable={false}
          href='/settings'
          className={`link ${pathname === '/settings' ? 'active' : ''}`}
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
