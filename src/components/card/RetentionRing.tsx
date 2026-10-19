import { useId } from 'react'

/**
 * Small ring showing the card's current probability of recall (FSRS
 * retrievability). New cards show an empty dashed ring.
 */
export function RetentionRing({ value, isNew, size = 26 }: { value: number; isNew: boolean; size?: number }) {
  const id = useId()
  const r = 9
  const c = 2 * Math.PI * r
  const pct = Math.round(value * 100)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={isNew ? '尚未學習' : `記憶強度 ${pct}%`}
      className="shrink-0"
    >
      <title>{isNew ? '尚未學習' : `記憶強度 ${pct}%`}</title>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-from)" />
          <stop offset="1" stopColor="var(--brand-to)" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke={isNew ? 'var(--c-ink-3)' : `url(#${id})`}
        strokeOpacity={isNew ? 1 : 0.35}
        strokeWidth="2.2"
        strokeDasharray={isNew ? '2.4 2.6' : undefined}
      />
      {!isNew && (
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray={`${c * value} ${c}`}
          transform="rotate(-90 12 12)"
        />
      )}
      {!isNew && <circle cx="12" cy="12" r="5.2" fill={`url(#${id})`} opacity={0.25 + value * 0.6} />}
    </svg>
  )
}
