import { useGlobal } from '@/providers/GlobalProvider'
import { faAdd, faInfo, faRemove } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function VersionsDownloadPopup () {
  const {
    serverVersionList,
    getSpecialVersionsList,
    selectedVersionList,
    setSelectedVersionList,
    setManagingVersion,
    setPopupMode,
    selectedGame,
    setViewingInfoFromDownloads,
    downloadVersions
  } = useGlobal()

  const game = serverVersionList?.games.find(g => g.id === selectedGame)

  if (!selectedGame || !game) return null

  const list = getSpecialVersionsList(selectedGame)

  return (
    <>
      <p className='text-xl text-center'>Select versions to download</p>
      <div className='popup-content'>
        {list.map((v, i) => (
          <div
            key={i}
            className='popup-entry grid items-center gap-3'
            style={{ gridTemplateColumns: 'auto minmax(0, 1fr) auto' }}
          >
            <button
              className='button btntheme3'
              onClick={() => {
                setManagingVersion(v.id)
                setViewingInfoFromDownloads(true)
                setPopupMode(2)
              }}
              title='Click to view version info.'
            >
              <FontAwesomeIcon icon={faInfo} /> Info
            </button>
            <p className='text-2xl text-center truncate' title={v.displayName}>
              {v.displayName}
            </p>
            <button
              className='button btntheme3'
              onClick={() => {
                setSelectedVersionList(prev =>
                  prev.includes(v.id)
                    ? prev.filter(i => i !== v.id)
                    : [...prev, v.id]
                )
              }}
              title={
                selectedVersionList.includes(v.id)
                  ? 'This version will be downloaded. Click to remove from the list of versions that will be downloaded.'
                  : 'This version will NOT be downloaded. Click to add from the list of versions that will be downloaded.'
              }
            >
              {selectedVersionList.includes(v.id) ? (
                <>
                  <FontAwesomeIcon icon={faRemove} /> Remove
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faAdd} /> Add
                </>
              )}
            </button>
          </div>
        ))}
      </div>
      <div className='flex justify-center'>
        <button
          className='button btntheme1 w-fit mt-2 -mb-4'
          onClick={() => {
            downloadVersions(
              selectedVersionList.map(versionId => ({
                id: versionId,
                type: 0
              }))
            )
            setPopupMode(1)
          }}
          disabled={selectedVersionList.length == 0}
          title={`Download ${selectedVersionList.length} version${
            selectedVersionList.length == 1 ? '' : 's'
          } of ${game.name}`}
        >
          Download {selectedVersionList.length} version
          {selectedVersionList.length == 1 ? '' : 's'}
        </button>
        <button
          className='button btntheme1 w-fit mt-2 ml-2 -mb-4'
          onClick={() => {
            const allIds = list.map(v => v.id)
            setSelectedVersionList(prev =>
              prev.length === allIds.length ? [] : allIds
            )
          }}
          title={
            selectedVersionList.length === list.length
              ? 'Click to remove all selected versions for download.'
              : 'Click to add all selected versions for download.'
          }
        >
          {selectedVersionList.length === list.length
            ? 'Deselect All'
            : 'Select All'}
        </button>
      </div>
    </>
  )
}
