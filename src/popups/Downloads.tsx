import { useGlobal } from '@/providers/GlobalProvider'
import prettyBytes from 'pretty-bytes'
import ProgressBar from '@/components/ProgressBar'
import { formatEtaSmart } from '@/lib/util'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCancel,
  faPause,
  faPlay,
  faTrash
} from '@fortawesome/free-solid-svg-icons'
import { invoke } from '@tauri-apps/api/core'
import { notifyUser } from '@/lib/notifications'
import { getCurrentWindow, UserAttentionType } from '@tauri-apps/api/window'

export default function DownloadsPopup () {
  const {
    downloadProgress,
    setDownloadProgress,
    downloadQueue,
    setDownloadQueue,
    notificationsAllowed,
    versionsList,
    modsList,
    versions,
    serverVersionList
  } = useGlobal()

  return (
    <>
      <p className='text-xl text-center'>Downloads</p>
      <div className='popup-content'>
        {downloadProgress.map((v, i) => {
          const queuePosition = downloadQueue.indexOf(v.version)
          return (
            <div
              key={i}
              className='popup-entry flex flex-col justify-between relative'
            >
              <div className='absolute right-2 top-2 flex flex-row gap-2'>
                <div
                  className='cursor-pointer bg-(--col5) hover:bg-(--col7) border border-(--col7) hover:border-(--col9) transition-colors w-8 h-8 flex items-center justify-center rounded-full'
                  hidden={!v.downloading && !v.paused}
                  onClick={async () => {
                    if (v.downloading) {
                      await invoke('cancel_download', { name: v.version })
                    } else {
                      setDownloadProgress(prev => {
                        const i = prev.findIndex(d => d.version === v.version)
                        if (i === -1) return prev
                        const copy = [...prev]
                        copy[i] = {
                          ...copy[i],
                          paused: false,
                          downloading: true
                        }
                        return copy
                      })
                      const res = await invoke<string>('download', {
                        url: v.url,
                        name: v.version,
                        hash: v.hash,
                        downloadType: v.type,
                        modId: String(v.modId ?? '')
                      })

                      if (res === '1') {
                        setDownloadProgress(prev =>
                          prev.filter(d => d.version !== v.version)
                        )
                        if (v.type != 1) {
                          if (v.type == 2) {
                            versions?.set('mods', {
                              ...modsList,
                              [v.modGame! + '-' + v.modId!]: {
                                [v.modVersion!]: Date.now()
                              }
                            })
                          } else {
                            versions?.set('list', {
                              ...versionsList,
                              [v.version]: Date.now()
                            })
                          }
                        }
                      } else if (res == '0') {
                        setDownloadProgress(prev => {
                          const i = prev.findIndex(d => d.version === v.version)
                          if (i === -1) return prev
                          if (prev[i].canceled) {
                            return prev.filter((_, idx) => idx !== i)
                          }
                          const copy = [...prev]
                          copy[i] = {
                            ...copy[i],
                            downloading: false,
                            paused: true,
                            failed: false
                          }
                          return copy
                        })
                      } else if (res == '-1') {
                        setDownloadProgress(prev =>
                          prev.map(d =>
                            d.version === v.version
                              ? {
                                  ...d,
                                  queued: false,
                                  failed: true,
                                  progress: 0
                                }
                              : d
                          )
                        )
                        if (notificationsAllowed)
                          await notifyUser(
                            'Download Failed',
                            `The download for version ${
                              serverVersionList?.versions.find(
                                vf => vf.id == v.version
                              )?.displayName
                            } has failed.`
                          )
                        await getCurrentWindow().requestUserAttention(
                          UserAttentionType.Critical
                        )
                      }
                    }
                  }}
                >
                  <FontAwesomeIcon
                    icon={v.downloading ? faPause : faPlay}
                    className='w-6 h-6'
                  />
                </div>
                <div
                  className='cursor-pointer bg-(--col5) hover:bg-(--col7) border border-(--col7) hover:border-(--col9) transition-colors w-8 h-8 flex items-center justify-center rounded-full'
                  hidden={!v.downloading && !v.paused}
                  onClick={async () => {
                    if (!v.paused) {
                      await invoke('cancel_download', { name: v.version })
                      setDownloadProgress(prev => {
                        const i = prev.findIndex(d => d.version === v.version)
                        if (i === -1) return prev
                        const copy = [...prev]
                        copy[i] = {
                          ...copy[i],
                          canceled: true
                        }
                        return copy
                      })
                    } else {
                      setDownloadProgress(prev => {
                        const i = prev.findIndex(d => d.version === v.version)
                        if (i === -1) return prev
                        return prev.filter((_, idx) => idx !== i)
                      })
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faCancel} className='w-6 h-6' />
                </div>
                <div
                  className='cursor-pointer bg-(--col5) hover:bg-(--col7) border border-(--col7) hover:border-(--col9) transition-colors w-8 h-8 flex items-center justify-center rounded-full'
                  hidden={!v.failed && !v.queued}
                  onClick={() => {
                    setDownloadQueue(prev =>
                      prev.filter(id => id !== v.version)
                    )
                    setDownloadProgress(prev =>
                      prev.filter(d => d.version !== v.version)
                    )
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} className='w-6 h-6' />
                </div>
              </div>
              <p className='text-2xl text-center'>
                {v.type == 1
                  ? 'Mod loader for '
                  : v.type == 2
                  ? 'Mod for '
                  : null}{' '}
                {
                  serverVersionList?.versions.find(vf => vf.id == v.version)
                    ?.displayName
                }
              </p>
              <div className='mt-6.25 flex items-center justify-between'>
                {v.failed || v.queued ? (
                  <div className='flex items-center justify-between w-full'>
                    <span
                      className={`${
                        v.failed ? 'text-red-500' : 'text-yellow-300'
                      } inline-block text-center flex-1`}
                    >
                      {v.failed
                        ? 'Download failed'
                        : queuePosition === 0
                        ? 'Starting soon...'
                        : `Queued (Position ${queuePosition + 1})`}
                    </span>
                  </div>
                ) : v.hash_checking ? (
                  <span className='text-blue-300 inline-block w-full text-center'>
                    Verifying file integerty...
                  </span>
                ) : v.unzipping ? (
                  <div className='flex flex-col gap-1 w-full'>
                    <span className='text-center'>
                      Unzipped {v.unzipped} / {v.unzipTotal} files
                    </span>
                    <ProgressBar
                      progress={(v.unzipped / v.unzipTotal) * 100}
                      className='w-full'
                    />
                  </div>
                ) : (
                  <div className='flex flex-col gap-1 w-full'>
                    <span className='text-center'>
                      Downloaded{' '}
                      {prettyBytes(v.progressBytes, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                      })}{' '}
                      of{' '}
                      {prettyBytes(v.size, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                      })}{' '}
                      (ETA: {formatEtaSmart(v.etaSecs)} &bull; Speed:{' '}
                      {prettyBytes(v.speed, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                      })}
                      /s)
                    </span>
                    <ProgressBar progress={v.progress} className='w-full' />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
