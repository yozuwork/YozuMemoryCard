import type { DailyStudyStat } from '../../types/stats'

interface ReviewsBarChartProps {
  data: DailyStudyStat[]
}

function formatDay(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(m)}/${Number(d)}`
}

export function ReviewsBarChart({ data }: ReviewsBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.reviews))
  const labelEvery = Math.ceil(data.length / 7)

  return (
    <figure>
      <div className="flex h-40 items-end gap-1.5 border-b border-line" role="img" aria-label={`近 ${data.length} 天每日複習次數`}>
        {data.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.date}：${d.reviews} 次複習`}>
            {d.reviews > 0 && (
              <span className="mb-1 text-center text-[10px] tabular-nums text-ink-2 opacity-0 transition-opacity group-hover:opacity-100">
                {d.reviews}
              </span>
            )}
            <div
              className="w-full rounded-t-[5px] bg-brand transition-[filter] group-hover:brightness-110"
              style={{ height: d.reviews ? `${Math.max(4, (d.reviews / max) * 100)}%` : '2px', opacity: d.reviews ? 1 : 0.25 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center text-[10px] text-ink-2">
            {i % labelEvery === 0 || i === data.length - 1 ? formatDay(d.date) : ''}
          </div>
        ))}
      </div>
    </figure>
  )
}
