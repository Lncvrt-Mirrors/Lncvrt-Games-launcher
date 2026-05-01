import { useGlobal } from '@/providers/GlobalProvider'
import {
  faArrowUpRightFromSquare,
  faInfo
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function GamesDownloadPopup () {
  const {
    serverVersionList,
    setSelectedGame,
    setManagingGame,
    setPopupMode,
    setShowPopup,
    setFadeOut,
    setViewingInfoFromDownloads
  } = useGlobal()

  return (
    <>
      <p className='text-xl text-center'>Select a game to download</p>
      <div className='popup-content'>
        {serverVersionList?.games
          .filter(g => {
            const gameVersions = serverVersionList.versions.filter(
              gv => gv.game === g.id
            )
            if (gameVersions.length > 0) return true
          })
          .map((g, i) => (
            <div
              key={i}
              className='popup-entry grid items-center gap-3'
              style={{ gridTemplateColumns: 'auto minmax(0, 1fr) auto' }}
            >
              <button
                className='button btntheme3'
                onClick={() => {
                  setViewingInfoFromDownloads(true)
                  setManagingGame(g.id)
                  setPopupMode(5)
                  setShowPopup(true)
                  setFadeOut(false)
                }}
                title='Click to view game info.'
              >
                <FontAwesomeIcon icon={faInfo} /> Info
              </button>
              <p className='text-2xl text-center truncate'>{g.name}</p>
              <button
                className='button btntheme3'
                onClick={() => setSelectedGame(g.id)}
                title='Click to view more versions of the game.'
              >
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} /> View
              </button>
            </div>
          ))}
      </div>
    </>
  )
}
