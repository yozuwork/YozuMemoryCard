import { useState } from 'react'
import { Check, ChevronDown, Layers, Plus } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { TextInput } from '../ui/Field'
import { Button } from '../ui/Button'
import { createDeck } from '../../db/repo'
import { colorNames, getColor } from '../../lib/deckColors'
import type { Deck } from '../../types/deck'

interface DeckSelectProps {
  decks: Deck[]
  value: string
  onChange: (id: string) => void
}

/** Pill that opens a sheet for choosing (or creating) the card's deck. */
export function DeckSelect({ decks, value, onChange }: DeckSelectProps) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const current = decks.find((d) => d.id === value)

  async function create() {
    if (!newName.trim()) return
    const deck = await createDeck({ name: newName, color: colorNames[decks.length % colorNames.length] })
    onChange(deck.id)
    setNewName('')
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`牌組：${current?.name ?? '未選擇'}`}
        className="flex min-h-11 min-w-0 max-w-[44vw] items-center gap-1.5 rounded-full bg-fill-2 px-3.5 text-[15px] font-medium text-ink sm:max-w-xs"
      >
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: current ? getColor(current.color).solid : 'var(--c-ink-3)' }} aria-hidden />
        <span className="truncate">{current?.name ?? '我的筆記'}</span>
        <ChevronDown size={16} className="shrink-0 text-ink-2" aria-hidden />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="所屬牌組">
        <div className="mb-6 overflow-hidden rounded-[18px] bg-surface" role="radiogroup" aria-label="牌組">
          {decks.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={d.id === value}
              onClick={() => {
                onChange(d.id)
                setOpen(false)
              }}
              className="list-row flex w-full items-center gap-3 pl-4 text-left active:bg-fill-2"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] text-white" style={{ background: getColor(d.color).solid }}>
                <Layers size={16} />
              </span>
              <span className="list-row-body flex min-h-[52px] flex-1 items-center gap-3 pr-4">
                <span className="flex-1 truncate text-[16px] text-ink">{d.name}</span>
                {d.id === value && <Check size={20} strokeWidth={2.5} className="text-tint" />}
              </span>
            </button>
          ))}
          {decks.length === 0 && <p className="px-4 py-5 text-center text-[15px] text-ink-2">尚無牌組，儲存時會自動建立「我的筆記」。</p>}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            // React events bubble through portals; keep the editor form from submitting too.
            e.stopPropagation()
            void create()
          }}
          className="flex gap-2"
        >
          <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新牌組名稱" aria-label="新牌組名稱" maxLength={40} />
          <Button type="submit" variant="secondary" disabled={!newName.trim()} icon={<Plus size={17} />} className="shrink-0">
            建立
          </Button>
        </form>
      </Modal>
    </>
  )
}
