import clsx from 'clsx'
import { ratingMeta } from '../../lib/ratings'
import { formatInterval } from '../../lib/time'
import type { Rating } from '../../types/card'

interface RatingButtonsProps {
  onRate: (rating: Rating) => void
  /** Due timestamp per rating, from the FSRS preview. */
  dues: Record<Rating, number>
  now: number
  disabled?: boolean
  showShortcuts?: boolean
}

export function RatingButtons({ onRate, dues, now, disabled, showShortcuts }: RatingButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="評分這張卡片">
      {ratingMeta.map((meta) => {
        const interval = formatInterval(dues[meta.key] - now)
        return (
          <button
            key={meta.key}
            type="button"
            disabled={disabled}
            onClick={() => onRate(meta.key)}
            aria-label={`${meta.label}，下次複習 ${interval}後`}
            className={clsx(
              'flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 transition-[transform,background-color] duration-150 active:scale-[0.96] disabled:opacity-50',
              meta.className,
            )}
          >
            <span className="text-[16px] font-semibold">{meta.label}</span>
            <span className="text-[12px] font-medium tabular-nums opacity-80">{interval}</span>
            {showShortcuts && (
              <kbd className="mt-0.5 hidden rounded-md bg-surface/70 px-1.5 font-sans text-[11px] text-ink-2 lg:block">
                {meta.shortcut}
              </kbd>
            )}
          </button>
        )
      })}
    </div>
  )
}
