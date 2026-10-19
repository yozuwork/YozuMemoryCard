import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

type Tone = 'new' | 'learning' | 'due' | 'neutral' | 'brand'

const toneClasses: Record<Tone, string> = {
  new: 'bg-tint/10 text-tint',
  learning: 'bg-warning/12 text-[#C76A00] dark:text-warning',
  due: 'bg-success/12 text-[#1F8A3C] dark:text-success',
  neutral: 'bg-fill text-ink-2',
  brand: 'bg-brand text-white',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ tone = 'neutral', className, ...rest }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums',
        toneClasses[tone],
        className,
      )}
      {...rest}
    />
  )
}
