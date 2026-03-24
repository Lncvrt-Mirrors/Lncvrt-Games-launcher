'use client'

import { useGlobal } from '@/app/GlobalProvider'
import { verifySignature } from '@/lib/Util'
import { Mod } from '@/types/Mod'
import { faDownload, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { arch, platform } from '@tauri-apps/plugin-os'
import { useEffect, useState } from 'react'

export default function ModDownloadsPopup () {
  const { getGameInfo, getVersionInfo, managingVersion } = useGlobal()

  const [mods, setMods] = useState<Mod[] | 0 | 1>(0)
  const [tab, setTab] = useState<number>(0)

  useEffect(() => {
    ;(async () => {
      const response = await fetch(
        `https://games.lncvrt.xyz/api/launcher/mods?platform=${platform()}&arch=${arch()}&version=${managingVersion}`
      )
      const signature = response.headers.get('x-signature') ?? ''
      const data = await response.json()
      if (await verifySignature(JSON.stringify(data), signature)) {
        setMods(data as Mod[])
      } else {
        setMods(1)
      }
    })()
  }, [managingVersion])

  if (!managingVersion) return <></>

  const versionInfo = getVersionInfo(managingVersion)
  const gameInfo = getGameInfo(versionInfo?.game)

  return (
    <>
      <p className='text-xl text-center'>
        {versionInfo?.displayName} Mod Manager
      </p>
      {typeof mods != 'number' ? (
        <div className='flex flex-row justify-center items-center -mb-2.5 gap-1.5'>
          <button
            className={`button ${tab == 0 ? 'btntheme3' : 'btntheme2'}`}
            onClick={() => setTab(0)}
          >
            <FontAwesomeIcon icon={faDownload} />
            Installed
          </button>
          <button
            className={`button ${tab == 1 ? 'btntheme3' : 'btntheme2'}`}
            onClick={() => setTab(1)}
          >
            <FontAwesomeIcon icon={faGlobe} />
            Download
          </button>
        </div>
      ) : null}
      <div className='popup-content h-full'>
        {typeof mods == 'number' ? (
          <p className='text-2xl flex justify-center items-center h-full'>
            {mods == 0 ? 'Loading' : 'Failed to load mods'}
          </p>
        ) : (
          <div className='flex flex-col items-center justify-center gap-2 p-2'>
            {tab == 0
              ? null
              : mods.map(v => {
                  return (
                    <div
                      key={v.id}
                      className='bg-(--col3) border border-(--col5) rounded-lg w-full h-16 flex flex-row'
                    >
                      <div className='flex flex-col justify-center h-full px-3 w-fit'>
                        <p>
                          <span className='text-lg'>{v.name}</span>{' '}
                          <span className='text-green-300'>
                            v{v.latestVersion}
                          </span>
                        </p>
                        <p className='text-yellow-200'>
                          Made by {v.creators[0]}
                          {v.creators.length < 2
                            ? ' + ' + v.creators.length + ' more'
                            : null}
                        </p>
                      </div>
                      <div className='flex flex-row items-center h-full gap-2 px-3 ml-auto'>
                        <p className='text-green-400'>
                          <FontAwesomeIcon icon={faDownload} /> {v.downloads}
                        </p>
                        <button className='button btntheme3'>Get</button>
                      </div>
                    </div>
                  )
                })}
          </div>
        )}
      </div>
    </>
  )
}
