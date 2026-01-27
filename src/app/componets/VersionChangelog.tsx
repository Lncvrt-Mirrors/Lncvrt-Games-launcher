'use client'

import { useGlobal } from '../GlobalProvider'

export default function VersionChangelog () {
  const {
    getGameInfo,
    getVersionInfo,
    managingVersion,
    downloadedVersionsConfig
  } = useGlobal()
  if (!managingVersion || !downloadedVersionsConfig) return <></>

  const versionInfo = getVersionInfo(managingVersion)
  const gameInfo = getGameInfo(versionInfo?.game)

  return (
    <>
      <p className='text-xl text-center'>
        Viewing changelog for {versionInfo?.displayName}
      </p>
      <div className='popup-content text-center p-2'>
        <span
          className='whitespace-pre-wrap'
          dangerouslySetInnerHTML={{
            __html: versionInfo?.changelog ? atob(versionInfo.changelog) : ''
          }}
        />
      </div>
    </>
  )
}
