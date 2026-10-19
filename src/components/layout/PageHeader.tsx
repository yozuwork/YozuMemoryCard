import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { GlassButton } from '../ui/GlassButton'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Controls placed top-left on phones, right of the title on desktop. */
  leading?: ReactNode
  trailing?: ReactNode
  /** Shows a back button that returns to `back` (or history). */
  back?: string | true
  className?: string
}

/**
 * Large-title header. Phones: a row of glass controls above a bold 34px title.
 * Desktop: back · title on the left, actions on the right. Each control is
 * rendered once and repositioned with flex `order`.
 */
export function PageHeader({ title, subtitle, leading, trailing, back, className }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className={clsx('mb-5 flex flex-wrap items-center gap-x-2 gap-y-4 lg:mb-8 lg:flex-nowrap lg:gap-x-3', className)}>
      {back && (
        <GlassButton
          round
          aria-label="返回"
          className="order-1"
          onClick={() => (back === true ? navigate(-1) : navigate(back))}
        >
          <ChevronLeft size={24} strokeWidth={2.2} />
        </GlassButton>
      )}
      {leading && <div className="order-2 flex items-center gap-2 lg:order-4">{leading}</div>}
      {trailing && <div className="order-3 ml-auto flex items-center gap-2 lg:order-5 lg:ml-0">{trailing}</div>}
      <div className="order-last min-w-0 basis-full lg:order-2 lg:flex-1 lg:basis-auto">
        <h1 className="text-[34px] font-bold leading-[1.15] tracking-tight text-ink [overflow-wrap:anywhere] lg:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
      </div>
    </header>
  )
}
