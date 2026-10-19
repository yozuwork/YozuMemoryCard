import { useMemo, useState } from 'react'
import { Check, ChevronDown, Layers } from 'lucide-react'
import type { Deck } from '../../types/deck'
import type { Flashcard } from '../../types/card'
import { computeDeckStats, groupByDeck } from '../../lib/deckStats'
import { getColor } from '../../lib/deckColors'
import { Modal } from '../ui/Modal'

interface DeckPickerProps {
  decks: Deck[]
  cards: Flashcard[]
  value: string
  onChange: (deckId: string) => void
  now: number
  dayStartHour: number
}

export function DeckPicker({ decks, cards, value, onChange, now, dayStartHour }: DeckPickerProps) {
  const [open, setOpen] = useState(false)
  const current = decks.find((d) => d.id === value)
  const byDeck = useMemo(() => groupByDeck(cards), [cards])

  const options = [
    { id: 'all', name: '所有筆記', color: undefined as string | undefined, stats: computeDeckStats(cards, now, dayStartHour) },
    ...decks.map((d) => ({ id: d.id, name: d.name, color: d.color as string | undefined, stats: computeDeckStats(byDeck.get(d.id) ?? [], now, dayStartHour) })),
  ]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="-ml-1 flex min-h-11 max-w-[60vw] items-center gap-1 rounded-lg px-1 text-[20px] font-semibold text-ink lg:max-w-none"
      >
        <span className="truncate underline decoration-[1.5px] underline-offset-[6px]">{current?.name ?? '所有筆記'}</span>
        <ChevronDown size={20} strokeWidth={2.4} className="shrink-0" aria-hidden />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="選擇要複習的牌組">
        <div className="overflow-hidden rounded-[18px] bg-surface" role="radiogroup" aria-label="牌組">
          {options.map((o) => {
            const selected = o.id === value
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  onChange(o.id)
                  setOpen(false)
                }}
                className="list-row flex w-full items-center gap-3 pl-4 text-left active:bg-fill-2"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-[10px] text-white"
                  style={{ background: o.color ? getColor(o.color).solid : 'var(--c-ink)' }}
                  aria-hidden
                >
                  <Layers size={16} />
                </span>
                <span className="list-row-body flex min-h-[60px] flex-1 items-center gap-3 pr-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] text-ink">{o.name}</span>
                    <span className="block text-[13px] text-ink-2">
                      {o.stats.total} 張 · <span className="text-tint">{o.stats.newCount} 新</span> ·{' '}
                      <span className="text-[#1F8A3C] dark:text-success">{o.stats.dueToday} 到期</span>
                    </span>
                  </span>
                  {selected && <Check size={20} strokeWidth={2.5} className="shrink-0 text-tint" />}
                </span>
              </button>
            )
          })}
        </div>
      </Modal>
    </>
  )
}
