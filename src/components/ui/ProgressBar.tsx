import clsx from 'clsx'

interface ProgressBarProps {
  value: number // 0-100
  className?: string
  label?: string
}

export function ProgressBar({ value, className, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-fill', className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-ios" style={{ width: `${clamped}%` }} />
    </div>
  )
}
