import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Deck, DeckStats } from '../../types/deck'
import { ProgressBar } from '../ui/ProgressBar'
import { DeckCover } from './DeckCover'

interface DeckCardProps {
  deck: Deck
  stats: DeckStats
}

export function DeckCard({ deck, stats }: DeckCardProps) {
  const learned = stats.total ? Math.round(((stats.total - stats.newCount) / stats.total) * 100) : 0

  return (
    <Link
      to={`/decks/${deck.id}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[22px] bg-surface shadow-card transition-[transform,box-shadow] duration-200 hover:shadow-float active:scale-[0.99]"
    >
      <DeckCover deck={deck} className="aspect-[16/7] w-full" />
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3.5">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[19px] font-semibold text-ink">{deck.name}</h3>
            <p className="truncate text-[14px] text-ink-2">{deck.description || `${stats.total} 張卡片`}</p>
          </div>
          <ChevronRight size={20} className="mt-1 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-fill-2 py-2.5">
            <dt className="text-[12px] text-ink-2">新卡片</dt>
            <dd className="text-[20px] font-semibold tabular-nums text-tint">{stats.newCount}</dd>
          </div>
          <div className="rounded-2xl bg-fill-2 py-2.5">
            <dt className="text-[12px] text-ink-2">今日到期</dt>
            <dd className="text-[20px] font-semibold tabular-nums text-[#1F8A3C] dark:text-success">{stats.dueToday}</dd>
          </div>
          <div className="rounded-2xl bg-fill-2 py-2.5">
            <dt className="text-[12px] text-ink-2">總數</dt>
            <dd className="text-[20px] font-semibold tabular-nums text-ink">{stats.total}</dd>
          </div>
        </dl>

        <div className="flex items-center gap-3">
          <ProgressBar value={learned} label={`已學習 ${learned}%`} className="flex-1" />
          <span className="shrink-0 text-[13px] tabular-nums text-ink-2">已學 {learned}%</span>
        </div>
      </div>
    </Link>
  )
}
