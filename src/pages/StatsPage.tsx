import { useMemo } from 'react'
import { CircleCheck, Flame, Layers, Timer } from 'lucide-react'
import { useCards, useDecks, useLogsSince } from '../hooks/useData'
import { useNow } from '../hooks/useEnvironment'
import { useSettings } from '../store/settings'
import { computeStreak, dailyStats, groupByDeck } from '../lib/deckStats'
import { DAY, studyDayBounds } from '../lib/time'
import { getColor } from '../lib/deckColors'
import { CardState } from '../types/card'
import { PageHeader } from '../components/layout/PageHeader'
import { StatTile } from '../components/stats/StatTile'
import { ReviewsBarChart } from '../components/stats/ReviewsBarChart'
import { ContributionHeatmap } from '../components/stats/ContributionHeatmap'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Controls'

export function StatsPage() {
  const now = useNow(60_000)
  const dayStartHour = useSettings((s) => s.dayStartHour)
  const { start } = studyDayBounds(now, dayStartHour)
  const logs = useLogsSince(start - 120 * DAY)
  const cards = useCards()
  const decks = useDecks()

  const daily = useMemo(() => (logs ? dailyStats(logs, 120, now, dayStartHour) : undefined), [logs, now, dayStartHour])
  const byDeck = useMemo(() => groupByDeck(cards ?? []), [cards])

  if (!daily || !cards || !decks) {
    return (
      <div>
        <PageHeader title="學習統計" back="/review" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[108px] rounded-[22px]" />
          ))}
        </div>
      </div>
    )
  }

  const today = daily[daily.length - 1]
  const last30 = daily.slice(-30)
  const reviews30 = last30.reduce((s, d) => s + d.reviews, 0)
  const withRate = last30.filter((d) => d.retentionRate !== null)
  const weighted = withRate.reduce((s, d) => s + (d.retentionRate ?? 0) * d.reviews, 0)
  const retention30 = reviews30 ? weighted / reviews30 : null
  const streak = computeStreak(daily)
  const mature = cards.filter((c) => c.state === CardState.Review && c.scheduledDays >= 21).length

  const stateCounts = [
    { label: '新卡片', n: cards.filter((c) => c.state === CardState.New).length, color: '#007AFF' },
    { label: '學習中', n: cards.filter((c) => c.state === CardState.Learning || c.state === CardState.Relearning).length, color: '#FF9500' },
    { label: '複習中', n: cards.filter((c) => c.state === CardState.Review).length - mature, color: '#34C759' },
    { label: '已熟記（≥21 天）', n: mature, color: '#B79CF6' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="學習統計" subtitle="所有數字都來自你的實際複習紀錄" back="/review" className="!mb-1" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={CircleCheck} label="今日複習" value={`${today.reviews}`} accent="#007AFF" />
        <StatTile icon={Flame} label="連續天數" value={`${streak} 天`} accent="#FF9500" />
        <StatTile
          icon={Timer}
          label="30 天答對率"
          value={retention30 === null ? '—' : `${Math.round(retention30 * 100)}%`}
          accent="#34C759"
        />
        <StatTile icon={Layers} label="總卡片數" value={`${cards.length}`} accent="#B79CF6" />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold text-ink">近 14 天複習次數</h2>
          <span className="text-[13px] text-ink-2">30 天共 {reviews30} 次</span>
        </div>
        <ReviewsBarChart data={daily.slice(-14)} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-[17px] font-semibold text-ink">近 120 天學習熱度</h2>
        <ContributionHeatmap data={daily} />
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-[17px] font-semibold text-ink">卡片狀態</h2>
          <div className="flex h-3 overflow-hidden rounded-full bg-fill" role="img" aria-label={stateCounts.map((s) => `${s.label} ${s.n}`).join('，')}>
            {stateCounts.map((s) =>
              s.n ? <div key={s.label} style={{ width: `${(s.n / Math.max(1, cards.length)) * 100}%`, background: s.color }} /> : null,
            )}
          </div>
          <ul className="mt-4 flex flex-col gap-2.5">
            {stateCounts.map((s) => (
              <li key={s.label} className="flex items-center gap-2.5 text-[15px]">
                <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
                <span className="flex-1 text-ink">{s.label}</span>
                <span className="tabular-nums text-ink-2">{s.n}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-[17px] font-semibold text-ink">牌組分佈</h2>
          {decks.length === 0 ? (
            <p className="text-[15px] text-ink-2">尚無牌組</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {decks.map((deck) => {
                const count = byDeck.get(deck.id)?.length ?? 0
                const pct = cards.length === 0 ? 0 : (count / cards.length) * 100
                return (
                  <li key={deck.id} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-[14px] text-ink">{deck.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-fill">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: getColor(deck.color).solid }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[14px] tabular-nums text-ink-2">{count}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
