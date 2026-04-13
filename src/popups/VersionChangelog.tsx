'use client'

import { useGlobal } from '@/providers/GlobalProvider'
import DOMPurify from 'dompurify'

export default function VersionChangelogPopup () {
  const { serverVersionList, managingVersion } = useGlobal()

  if (!managingVersion) return <></>

  const versionInfo = serverVersionList?.versions.find(
    vf => vf.id == managingVersion
  )

  return (
    <>
      <p className='text-xl text-center'>
        Viewing changelog {versionInfo?.displayName}
      </p>
      <div className='popup-content h-full w-full p-2'>
        <p
          className='whitespace-pre-line'
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(
              atob(versionInfo?.changelog ?? '')
                .replace(/^- /gm, '&bull; ')
                .replaceAll(/`([^`]+)`/g, '<code>$1</code>')
            )
          }}
        ></p>
      </div>
    </>
  )
}
