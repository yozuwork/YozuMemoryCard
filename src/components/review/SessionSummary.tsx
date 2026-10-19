import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ChartColumn, Clock, Flame, Plus, Sparkles } from 'lucide-react'
import { Rating, type ReviewLogEntry } from '../../types/card'
import { CardState } from '../../types/card'
import { formatDuration, formatRelativeFuture } from '../../lib/time'
import { ratingMeta } from '../../lib/ratings'
import { Button } from '../ui/Button'
import { buttonClasses } from '../ui/buttonStyles'

interface SessionSummaryProps {
  todayLogs: ReviewLogEntry[]
  streak: number
  /** Next moment a card becomes available again, if known. */
  nextDue: number | null
  nextDueCount: number
  now: number
  canLearnMore: boolean
  onLearnMore: () => void
}

const barColor: Record<Rating, string> = {
  [Rating.Again]: '#FF3B30',
  [Rating.Hard]: '#FF9500',
  [Rating.Good]: '#34C759',
  [Rating.Easy]: '#007AFF',
}

export function SessionSummary({ todayLogs, streak, nextDue, nextDueCount, now, canLearnMore, onLearnMore }: SessionSummaryProps) {
  const total = todayLogs.length
  const newCards = new Set(todayLogs.filter((l) => l.state === CardState.New).map((l) => l.cardId)).size
  const correct = todayLogs.filter((l) => l.rating !== Rating.Again).length
  const ms = todayLogs.reduce((s, l) => s + l.durationMs, 0)
  const counts = ratingMeta.map((m) => ({ ...m, n: todayLogs.filter((l) => l.rating === m.key).length }))

  const tiles = [
    { label: '今日複習', value: `${total}`, unit: '次' },
    { label: '新學卡片', value: `${newCards}`, unit: '張' },
    { label: '答對率', value: total ? `${Math.round((correct / total) * 100)}` : '—', unit: total ? '%' : '' },
    { label: '學習時間', value: formatDuration(ms), unit: '' },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="mx-auto flex w-full max-w-[460px] flex-col items-center text-center"
      aria-labelledby="summary-title"
    >
      <div className="relative mb-5 flex size-20 items-center justify-center rounded-[26px] bg-brand text-white shadow-[0_16px_40px_-12px_rgb(183_156_246/0.9)]">
        <Sparkles size={34} />
      </div>
      <h2 id="summary-title" className="text-[26px] font-bold tracking-tight text-ink">
        {total > 0 ? '今日任務完成' : '目前沒有要複習的卡片'}
      </h2>
      <p className="mt-1.5 text-[15px] text-ink-2">
        {nextDue
          ? `下一批 ${nextDueCount} 張卡片將於 ${formatRelativeFuture(nextDue, now)}到期`
          : '新增卡片後就能開始學習'}
      </p>

      {total > 0 && (
        <>
          <div className="mt-7 grid w-full grid-cols-2 gap-3">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-[18px] bg-fill-2 px-4 py-3.5 text-left">
                <p className="text-[13px] text-ink-2">{t.label}</p>
                <p className="mt-0.5 text-[24px] font-semibold tabular-nums text-ink">
                  {t.value}
                  {t.unit && <span className="ml-0.5 text-[15px] font-medium text-ink-2">{t.unit}</span>}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 w-full text-left">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-fill" role="img" aria-label={counts.map((c) => `${c.label} ${c.n} 次`).join('，')}>
              {counts.map((c) =>
                c.n ? <div key={c.key} style={{ width: `${(c.n / total) * 100}%`, background: barColor[c.key] }} /> : null,
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
              {counts.map((c) => (
                <span key={c.key} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: barColor[c.key] }} aria-hidden />
                  {c.label} {c.n}
                </span>
              ))}
            </div>
          </div>

          {streak > 0 && (
            <p className="mt-5 flex items-center gap-1.5 text-[15px] font-medium text-ink">
              <Flame size={18} className="text-[#FF9500]" aria-hidden />
              已連續學習 {streak} 天
            </p>
          )}
        </>
      )}

      <div className="mt-8 flex w-full flex-col gap-2.5">
        {canLearnMore && (
          <Button variant="brand" size="lg" fullWidth onClick={onLearnMore} icon={<Clock size={19} />}>
            再學 10 張新卡片
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <Link to="/record" className={buttonClasses({ variant: 'secondary', size: 'lg', fullWidth: true })}>
            <Plus size={19} aria-hidden />
            新增卡片
          </Link>
          <Link to="/stats" className={buttonClasses({ variant: 'secondary', size: 'lg', fullWidth: true })}>
            <ChartColumn size={19} aria-hidden />
            查看統計
          </Link>
        </div>
      </div>
    </motion.section>
  )
}
