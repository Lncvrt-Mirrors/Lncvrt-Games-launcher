import { useGlobal } from '@/app/GlobalProvider'
import { faAdd, faInfo, faRemove } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function VersionsDownloadPopup () {
  const {
    selectedVersionList,
    setSelectedVersionList,
    setManagingVersion,
    setPopupMode,
    getSpecialVersionsList,
    selectedGame,
    setViewingInfoFromDownloads,
    downloadedVersionsConfig,
    downloadProgress,
    downloadVersions,
    getGameInfo,
    downloadQueue
  } = useGlobal()
  if (!selectedGame) return <></>

  return (
    <>
      <p className='text-xl text-center'>Select versions to download</p>
      <div className='popup-content'>
        {getSpecialVersionsList(selectedGame).map((v, i) => (
          <div key={i} className='popup-entry'>
            <div className='flex items-center'>
              <p
                className={`text-2xl truncate ${
                  selectedVersionList.includes(v.id)
                    ? 'max-w-84.5'
                    : 'max-w-91.5'
                }`}
              >
                {v.displayName}
              </p>
            </div>
            <button
              className='button btntheme3 right-20.75 bottom-1.75'
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
            <button
              className='button btntheme3 right-1.5 bottom-1.75'
              onClick={() => {
                setManagingVersion(v.id)
                setViewingInfoFromDownloads(true)
                setPopupMode(2)
              }}
              title='Click to view version info'
            >
              <FontAwesomeIcon icon={faInfo} /> Info
            </button>
          </div>
        ))}
      </div>
      <div className='flex justify-center'>
        <button
          className='button btntheme1 w-fit mt-2 -mb-4'
          onClick={() => {
            if (downloadedVersionsConfig) {
              downloadVersions(selectedVersionList)
            }
          }}
          disabled={selectedVersionList.length === 0}
          title={
            selectedVersionList.length === 0
              ? 'Select at least one version to download'
              : downloadProgress.length > 0 || downloadQueue.length > 0
              ? `Add ${selectedVersionList.length} version${
                  selectedVersionList.length == 1 ? '' : 's'
                } to download queue`
              : `Download ${selectedVersionList.length} version${
                  selectedVersionList.length == 1 ? '' : 's'
                } of ${getGameInfo(selectedGame)?.name}`
          }
        >
          {downloadProgress.length > 0 || downloadQueue.length > 0
            ? `Add ${selectedVersionList.length} to Queue`
            : `Download ${selectedVersionList.length}`}{' '}
          version
          {selectedVersionList.length == 1 ? '' : 's'}
        </button>
        <button
          className='button btntheme1 w-fit mt-2 ml-2 -mb-4'
          onClick={() => {
            const allIds = getSpecialVersionsList(selectedGame).map(v => v.id)
            setSelectedVersionList(prev =>
              prev.length === allIds.length ? [] : allIds
            )
          }}
          title={
            selectedVersionList.length ===
            getSpecialVersionsList(selectedGame).length
              ? 'Click to remove all selected versions for download.'
              : 'Click to add all selected versions for download.'
          }
        >
          {selectedVersionList.length ===
          getSpecialVersionsList(selectedGame).length
            ? 'Deselect All'
            : 'Select All'}
        </button>
      </div>
    </>
  )
}
