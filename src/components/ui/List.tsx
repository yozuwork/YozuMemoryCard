import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'

interface ListSectionProps {
  title?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}

/** iOS-style inset grouped section: small grey header, white rounded block. */
export function ListSection({ title, footer, children, className }: ListSectionProps) {
  return (
    <section className={clsx('mb-8', className)}>
      {title && <h2 className="mb-2 flex items-center gap-2 px-4 text-[13px] font-medium text-ink-2">{title}</h2>}
      <div className="overflow-hidden rounded-[18px] bg-surface shadow-card">{children}</div>
      {footer && <p className="mt-2 px-4 text-[13px] leading-relaxed text-ink-2">{footer}</p>}
    </section>
  )
}

interface ListRowProps {
  label: ReactNode
  icon?: ReactNode
  /** Secondary line below the label. */
  detail?: ReactNode
  /** Right-aligned value text. */
  value?: ReactNode
  /** Right-aligned control (switch, stepper…). */
  accessory?: ReactNode
  chevron?: boolean
  to?: string
  onClick?: () => void
  destructive?: boolean
  tint?: boolean
  disabled?: boolean
  className?: string
  children?: ReactNode
}

export function ListRow({
  label,
  icon,
  detail,
  value,
  accessory,
  chevron,
  to,
  onClick,
  destructive,
  tint,
  disabled,
  className,
  children,
}: ListRowProps) {
  const body = (
    <>
      {icon && <span className="flex size-[30px] shrink-0 items-center justify-center">{icon}</span>}
      <span className="list-row-body flex min-h-[52px] min-w-0 flex-1 items-center gap-3 py-2.5 pr-4">
        <span className="min-w-0 flex-1">
          <span
            className={clsx(
              'block text-[16px] leading-snug',
              destructive ? 'text-danger' : tint ? 'text-tint' : 'text-ink',
            )}
          >
            {label}
          </span>
          {detail && <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{detail}</span>}
        </span>
        {value !== undefined && <span className="shrink-0 text-[16px] text-ink-2">{value}</span>}
        {accessory}
        {chevron && <ChevronRight size={18} className="shrink-0 text-ink-3" aria-hidden />}
      </span>
      {children}
    </>
  )
  const cls = clsx(
    'list-row relative flex w-full items-center gap-3 pl-4 text-left',
    (to || onClick) && !disabled && 'transition-colors active:bg-fill-2 hover:bg-fill-2/60',
    disabled && 'opacity-45',
    className,
  )
  if (to && !disabled)
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={cls}>
        {body}
      </button>
    )
  return <div className={cls}>{body}</div>
}
