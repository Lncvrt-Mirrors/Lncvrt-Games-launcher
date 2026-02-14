type ProgressBarProps = {
  progress: number
  className?: string
}

export default function ProgressBar ({ progress, className }: ProgressBarProps) {
  return (
    <div
      className={`w-full bg-(--col1) border border-(--col5) rounded-full h-4 overflow-hidden ${className}`}
    >
      <div
        className='bg-(--col8) border-r border-r-(--col5) h-full'
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
