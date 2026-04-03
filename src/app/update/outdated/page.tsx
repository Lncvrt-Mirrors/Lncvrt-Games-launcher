'use client'

import { openUrl } from '@tauri-apps/plugin-opener'

export default function UpdateCheckingPage () {
  return (
    <div className='text-center'>
      <p className='text-6xl mb-4'>Outdated Launcher!</p>
      <p className='text-2xl mb-4'>
        Please update to the latest version to continue.
      </p>
      <button
        className='button btntheme1'
        onClick={() => openUrl('https://games.lncvrt.xyz/download')}
      >
        Download latest version!
      </button>
    </div>
  )
}
