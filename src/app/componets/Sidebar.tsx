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
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useGlobal } from '../GlobalProvider'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

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
        data-tauri-drag-region
        style={{
          height: '30px',
          width: 'calc(var(--spacing) * 60)',
          top: 0,
          left: 0,
          marginBottom: '-15px',
          position: 'absolute',
          zIndex: 9999,
          display: platform() == 'macos' ? 'block' : 'none',
          pointerEvents: 'auto'
        }}
      ></div>
      <div className='logo'>
        <Image
          draggable={false}
          src={Icon}
          width={48}
          height={48}
          alt=''
          style={{
            marginTop: ['windows', 'macos'].includes(platform())
              ? '20px'
              : '0px',
            marginBottom: '-20px'
          }}
        />
      </div>
      <nav className='nav-links'>
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
              <FontAwesomeIcon icon={faGamepad} className='mr-1' />{' '}
              {i.cutOff == null
                ? i.name
                : i.name.substring(0, i.cutOff) + '...'}
            </Link>
          ))}
        <Link
          draggable={false}
          href='/settings'
          className={`link ${pathname === '/settings' ? 'active' : ''}`}
        >
          <FontAwesomeIcon icon={faCog} className='mr-1' /> Settings
        </Link>
        <a
          draggable={false}
          onClick={() => openUrl('https://games.lncvrt.xyz/discord')}
          className='link'
        >
          <FontAwesomeIcon icon={faDiscord} className='mr-1' /> Community
        </a>
      </nav>
      <div
        className='sidebar-downloads'
        style={{ display: downloadProgress.length != 0 ? 'block' : 'none' }}
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
