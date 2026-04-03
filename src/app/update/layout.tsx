'use client'

import '@/styles/globals.css'
import { platform } from '@tauri-apps/plugin-os'
import { Roboto } from 'next/font/google'
import { useEffect, useState } from 'react'

const roboto = Roboto({
  subsets: ['latin']
})

export default function RootLayout ({
  children
}: {
  children: React.ReactNode
}) {
  const [platformName, setPlatformName] = useState<string | null>(null)

  useEffect(() => {
    setTimeout(() => setPlatformName(platform()), 0)
  }, [])

  return (
    <>
      <html lang='en' className={roboto.className}>
        <body className='dark-theme'>
          <div
            className='relative z-2 w-screen border-b border-b-(--col3) h-8.25 bg-(--col1)'
            hidden={platformName != 'windows'}
          />
          <div
            className={`w-screen ${
              platformName == 'windows' ? 'h-[calc(100vh-64px)]' : 'h-screen'
            } flex items-center justify-center`}
          >
            {children}
          </div>
        </body>
      </html>
    </>
  )
}
