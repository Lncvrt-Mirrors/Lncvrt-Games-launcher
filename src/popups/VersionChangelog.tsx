'use client'

import { useGlobal } from '@/providers/GlobalProvider'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import DOMPurify from 'dompurify'
import { useState } from 'react'

export default function VersionChangelogPopup () {
  const { serverVersionList, managingVersion, developerMode } = useGlobal()
  const [raw, setRaw] = useState<boolean>(false)

  if (!managingVersion) return null

  const versionInfo = serverVersionList?.versions.find(
    vf => vf.id == managingVersion
  )

  return (
    <>
      {developerMode && (
        <button
          className='popup-top-button btntheme1 right-2'
          onClick={() => setRaw(!raw)}
        >
          <FontAwesomeIcon icon={raw ? faEyeSlash : faEye} />
        </button>
      )}
      <p className='text-xl text-center'>
        Viewing changelog {versionInfo?.displayName}
      </p>
      <div className='popup-content h-full w-full p-2 select-text'>
        {raw ? (
          <>
            <p>Decoded: {atob(versionInfo?.changelog ?? '')}</p>
            <p>Not decoded: {versionInfo?.changelog}</p>
          </>
        ) : (
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
        )}
      </div>
    </>
  )
}
