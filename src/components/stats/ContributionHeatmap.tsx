import type { DailyStudyStat } from '../../types/stats'

interface ContributionHeatmapProps {
  data: DailyStudyStat[]
}

/** Opacity steps of the brand colour; empty days use the neutral fill. */
function cellStyle(reviews: number, max: number): React.CSSProperties {
  if (reviews === 0) return { background: 'var(--c-fill)' }
  const ratio = reviews / max
  const alpha = ratio < 0.25 ? 0.3 : ratio < 0.5 ? 0.5 : ratio < 0.75 ? 0.75 : 1
  return { background: `color-mix(in srgb, var(--brand-to) ${alpha * 100}%, transparent)` }
}

export function ContributionHeatmap({ data }: ContributionHeatmapProps) {
  const max = Math.max(1, ...data.map((d) => d.reviews))
  // Lay days out in week columns, oldest on the left.
  const first = new Date(`${data[0]?.date}T12:00:00`)
  const pad = Number.isNaN(first.getTime()) ? 0 : first.getDay()
  const cells: (DailyStudyStat | null)[] = [...Array(pad).fill(null), ...data]

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div
          className="grid w-max grid-flow-col grid-rows-7 gap-[3px]"
          role="img"
          aria-label={`近 ${data.length} 天中有 ${data.filter((d) => d.reviews > 0).length} 天有複習`}
        >
          {cells.map((d, i) =>
            d ? (
              <div key={d.date} title={`${d.date}：${d.reviews} 次複習`} className="size-[13px] rounded-[3px]" style={cellStyle(d.reviews, max)} />
            ) : (
              <div key={`pad-${i}`} className="size-[13px]" />
            ),
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[12px] text-ink-2" aria-hidden>
        <span>少</span>
        {[0, 0.2, 0.45, 0.7, 1].map((r) => (
          <div key={r} className="size-3 rounded-[3px]" style={cellStyle(r * max, max)} />
        ))}
        <span>多</span>
      </div>
    </div>
  )
}
