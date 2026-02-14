import { useGlobal } from '@/app/GlobalProvider'
import { writeVersionsConfig } from '@/lib/BazookaManager'
import { openFolder } from '@/lib/Util'
import { BaseDirectory, exists, remove } from '@tauri-apps/plugin-fs'

export default function ManageVersionPopup () {
  const {
    getVersionInfo,
    managingVersion,
    closePopup,
    setDownloadedVersionsConfig,
    setManagingVersion,
    downloadVersions,
    setSelectedVersionList,
    setPopupMode
  } = useGlobal()
  if (!managingVersion) return <></>

  return (
    <>
      <p className='text-xl text-center'>
        Manage {getVersionInfo(managingVersion)?.displayName}
      </p>
      <div className='popup-content flex flex-col items-center justify-center gap-2 h-full'>
        <button
          className='button btntheme2'
          onClick={async () => {
            closePopup()

            setDownloadedVersionsConfig(prev => {
              if (!prev) return prev
              const updatedList = Object.fromEntries(
                Object.entries(prev.list).filter(([k]) => k !== managingVersion)
              )
              const updatedConfig = {
                ...prev,
                list: updatedList
              }
              writeVersionsConfig(updatedConfig)
              return updatedConfig
            })

            if (
              await exists('game/' + managingVersion, {
                baseDir: BaseDirectory.AppLocalData
              })
            )
              await remove('game/' + managingVersion, {
                baseDir: BaseDirectory.AppLocalData,
                recursive: true
              })
          }}
          title='Click to uninstall this game. This will NOT remove any progress or any save files.'
        >
          Uninstall
        </button>
        <button
          className='button btntheme2'
          onClick={async () => {
            //change popup to downloads
            setManagingVersion(null)
            setPopupMode(1)

            //uninstall
            setDownloadedVersionsConfig(prev => {
              if (!prev) return prev
              const updatedList = Object.fromEntries(
                Object.entries(prev.list).filter(([k]) => k !== managingVersion)
              )
              const updatedConfig = {
                ...prev,
                list: updatedList
              }
              writeVersionsConfig(updatedConfig)
              return updatedConfig
            })

            if (
              await exists('game/' + managingVersion, {
                baseDir: BaseDirectory.AppLocalData
              })
            )
              await remove('game/' + managingVersion, {
                baseDir: BaseDirectory.AppLocalData,
                recursive: true
              })

            //reinstall
            setSelectedVersionList([managingVersion])
            downloadVersions([managingVersion])
          }}
          title="Click to reinstall this game. This will NOT remove any progress or any save files. This WILL uninstall any modifications to the game's executable files."
        >
          Reinstall
        </button>
        <button
          className='button btntheme2'
          onClick={async () => openFolder(managingVersion)}
          title="Click to browse the game's files."
        >
          Open Folder
        </button>
      </div>
    </>
  )
}
