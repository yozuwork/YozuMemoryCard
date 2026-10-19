import type { LucideIcon } from 'lucide-react'
import { Card } from '../ui/Card'

interface StatTileProps {
  icon: LucideIcon
  label: string
  value: string
  /** Hex colour for the icon chip. */
  accent: string
}

export function StatTile({ icon: Icon, label, value, accent }: StatTileProps) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <span
        className="flex size-9 items-center justify-center rounded-xl"
        style={{ background: `${accent}1f`, color: accent }}
        aria-hidden
      >
        <Icon size={18} />
      </span>
      <p className="text-[24px] font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[13px] text-ink-2">{label}</p>
    </Card>
  )
}
