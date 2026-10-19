import { useId } from 'react'
import { getColor } from '../../lib/deckColors'

/** Filled tag glyph in a palette gradient; grey when `color` is omitted. */
export function TagIcon({ color, size = 26 }: { color?: string; size?: number }) {
  const id = useId()
  const c = color ? getColor(color) : { from: '#A1A1A6', to: '#8E8E93' }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.from} />
          <stop offset="1" stopColor={c.to} />
        </linearGradient>
      </defs>
      <path
        d="M3 4.6A1.6 1.6 0 0 1 4.6 3h6.5c.43 0 .83.17 1.13.47l8.6 8.6a1.6 1.6 0 0 1 0 2.26l-6.5 6.5a1.6 1.6 0 0 1-2.26 0l-8.6-8.6A1.6 1.6 0 0 1 3 11.1V4.6Z"
        fill={`url(#${id})`}
      />
      <circle cx="7.6" cy="7.6" r="1.6" fill="#fff" opacity="0.95" />
    </svg>
  )
}
