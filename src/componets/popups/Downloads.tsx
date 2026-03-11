import { useGlobal } from '@/app/GlobalProvider'
import prettyBytes from 'pretty-bytes'
import ProgressBar from '../ProgressBar'
import { formatEtaSmart } from '@/lib/Util'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCancel, faPause, faPlay } from '@fortawesome/free-solid-svg-icons'
import { invoke } from '@tauri-apps/api/core'

export default function DownloadsPopup () {
  const {
    downloadProgress,
    getVersionInfo,
    setDownloadProgress,
    downloadQueue,
    setDownloadQueue
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
                  hidden={!v.downloading}
                  onClick={async () => {
                    await invoke('cancel_download', { name: v.version })
                  }}
                >
                  <FontAwesomeIcon icon={faPause} className='w-6 h-6' />
                </div>
                <div
                  className='cursor-pointer bg-(--col5) hover:bg-(--col7) border border-(--col7) hover:border-(--col9) transition-colors w-8 h-8 flex items-center justify-center rounded-full'
                  hidden={!v.paused}
                  onClick={async () => {
                    await invoke<string>('download', {
                      url: v.url,
                      name: v.version,
                      executable: v.executable,
                      hash: v.hash
                    })
                  }}
                >
                  <FontAwesomeIcon icon={faPlay} className='w-6 h-6' />
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
              </div>
              <p className='text-2xl text-center'>
                {getVersionInfo(v.version)?.displayName}
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
                    <button
                      className='button btntheme3 -ml-1.25'
                      onClick={() => {
                        setDownloadQueue(prev =>
                          prev.filter(id => id !== v.version)
                        )
                        setDownloadProgress(prev =>
                          prev.filter(d => d.version !== v.version)
                        )
                      }}
                      title='Click to remove this version from the download queue.'
                    >
                      Remove
                    </button>
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
