import type { ReactNode } from 'react'
import clsx from 'clsx'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-4 px-6 py-16 text-center', className)}>
      <div className="relative flex size-16 items-center justify-center rounded-[20px] bg-brand text-white shadow-[0_10px_30px_-10px_rgb(183_156_246/0.8)]">
        {icon}
      </div>
      <div className="max-w-xs">
        <p className="text-[17px] font-semibold text-ink">{title}</p>
        {description && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  )
}
