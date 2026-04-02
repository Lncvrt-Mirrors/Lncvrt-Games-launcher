import { useGlobal } from '@/providers/GlobalProvider'
import {
  faCheck,
  faCode,
  faDownload,
  faShieldHalved,
  faWarning
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function GamesDownloadPopup () {
  const { serverVersionList, setSelectedGame, versionsList } = useGlobal()

  return (
    <>
      <p className='text-xl text-center'>Select a game to download</p>
      <div className='popup-content'>
        {serverVersionList?.games
          .filter(i => {
            const gameVersions = serverVersionList.versions.filter(
              vf => vf.game === i.id
            )
            if (gameVersions.length > 0) return true
          })
          .map((v, i) => (
            <div key={i} className='popup-entry'>
              <p className='text-2xl'>{v.name}</p>
              <div className='flex gap-2'>
                <div
                  className='entry-info-item btntheme3'
                  title='The amount of versions installed of this game in installed/installable format.'
                >
                  <p>
                    {(() => {
                      const gameVersions = serverVersionList.versions.filter(
                        vf => vf.game === v.id
                      )
                      const installed = gameVersions.filter(v =>
                        Object.keys(versionsList).includes(v.id)
                      ).length
                      return gameVersions.length
                        ? `${installed}/${gameVersions.length}`
                        : 'N/A'
                    })()}{' '}
                    versions installed
                  </p>
                </div>
                <div
                  className='entry-info-item btntheme3'
                  hidden={!v.official}
                  title='This game is official.'
                >
                  <FontAwesomeIcon icon={faCheck} color='#19c84b' />
                  <p>Official</p>
                </div>
                <div
                  className='entry-info-item btntheme3'
                  hidden={v.official}
                  title={
                    v.verified
                      ? 'This game is verified to be safe'
                      : 'This game is NOT verified to be save. Proceed with caution.'
                  }
                >
                  <FontAwesomeIcon
                    icon={v.verified ? faShieldHalved : faWarning}
                    color={v.verified ? '#19c84b' : '#ffc800'}
                  />
                  <p>{v.verified ? 'Verified' : 'Unverified'}</p>
                </div>
              </div>
              <div
                className='entry-info-item btntheme3 mt-2'
                hidden={v.developer == null}
                title={`The developer of ${v.name} is ${v.developer}.`}
              >
                <FontAwesomeIcon icon={faCode} color='lightgray' />
                <p>Developer: {v.developer}</p>
              </div>
              <button
                className='button btntheme3 right-2 bottom-2'
                onClick={() => setSelectedGame(v.id)}
                title='Click to download more versions of the game.'
              >
                <>
                  <FontAwesomeIcon icon={faDownload} /> Download
                </>
              </button>
            </div>
          ))}
      </div>
    </>
  )
}
