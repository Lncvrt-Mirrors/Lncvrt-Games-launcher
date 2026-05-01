import { useGlobal } from '@/providers/GlobalProvider'
import {
  faArrowUpRightFromSquare,
  faInfo
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function GamesDownloadPopup () {
  const { serverVersionList, setSelectedGame } = useGlobal()

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
            <div
              key={i}
              className='popup-entry grid items-center gap-3'
              style={{ gridTemplateColumns: 'auto minmax(0, 1fr) auto' }}
            >
              <button
                className='button btntheme3'
                onClick={() => setSelectedGame(v.id)}
                title='Click to view game info.'
              >
                <FontAwesomeIcon icon={faInfo} /> Info
              </button>
              <p className='text-2xl text-center truncate'>{v.name}</p>
              <button
                className='button btntheme3'
                onClick={() => setSelectedGame(v.id)}
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
