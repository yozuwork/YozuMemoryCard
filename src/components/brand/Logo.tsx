import { useId } from 'react'

/** YoZu mark: two stacked study cards with a spark — the app's own identity. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F7A6CB" />
          <stop offset="1" stopColor="#AE95F4" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="var(--c-surface)" />
      <rect x="18" y="14" width="26" height="34" rx="6.5" fill={`url(#${id}-g)`} opacity="0.4" transform="rotate(-13 31 31)" />
      <rect x="21" y="16" width="26" height="34" rx="6.5" fill={`url(#${id}-g)`} transform="rotate(7 34 33)" />
      <path
        d="M34.6 25.5c.5 3 1.9 4.4 4.9 4.9-3 .5-4.4 1.9-4.9 4.9-.5-3-1.9-4.4-4.9-4.9 3-.5 4.4-1.9 4.9-4.9Z"
        fill="#fff"
      />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[19px] font-bold tracking-tight text-ink">YoZu</span>
      <span className="text-[13px] font-semibold text-brand">記憶卡</span>
    </span>
  )
}
