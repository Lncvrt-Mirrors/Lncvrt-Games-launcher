'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function UpdateCheckingPage () {
  const router = useRouter()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      router.push('/main')
    }
  }, [])

  return <p className='text-5xl text-center'>Checking for updates</p>
}
