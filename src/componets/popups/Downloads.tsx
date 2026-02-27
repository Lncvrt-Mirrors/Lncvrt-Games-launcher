import { useGlobal } from '@/app/GlobalProvider'
import prettyBytes from 'pretty-bytes'
import ProgressBar from '../ProgressBar'
import { formatEtaSmart } from '@/lib/Util'

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
            <div key={i} className='popup-entry flex flex-col justify-between'>
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
                ) : v.hash_checking || v.finishing ? (
                  <span
                    className={`${
                      v.hash_checking ? 'text-blue-300' : 'text-green-300'
                    } inline-block w-full text-center`}
                  >
                    {v.hash_checking ? 'Verifying file integerty' : 'Finishing'}
                    ...
                  </span>
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
