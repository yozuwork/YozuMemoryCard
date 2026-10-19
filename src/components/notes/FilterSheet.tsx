import clsx from 'clsx'
import { Check } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Switch } from '../ui/Controls'
import { ListRow, ListSection } from '../ui/List'
import { TagIcon } from '../tags/TagIcon'
import { CardState } from '../../types/card'
import type { Deck, Tag } from '../../types/deck'
import { emptyFilter, type NoteFilter } from '../../lib/noteFilters'
import { stateLabel } from '../../lib/ratings'
import { getColor } from '../../lib/deckColors'

interface FilterSheetProps {
  open: boolean
  onClose: () => void
  value: NoteFilter
  onChange: (f: NoteFilter) => void
  decks: Deck[]
  tags: Tag[]
  /** Hide the deck section when the list is already scoped to one deck. */
  showDecks: boolean
  showTags: boolean
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[15px] font-medium transition-colors',
        active ? 'bg-ink text-surface' : 'bg-surface text-ink shadow-card',
      )}
    >
      {active && <Check size={15} strokeWidth={2.8} />}
      {children}
    </button>
  )
}

const states = [CardState.New, CardState.Learning, CardState.Review, CardState.Relearning]

export function FilterSheet({ open, onClose, value, onChange, decks, tags, showDecks, showTags }: FilterSheetProps) {
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="篩選"
      leading={
        <button type="button" onClick={() => onChange(emptyFilter)} className="min-h-11 px-1 text-[17px] text-tint">
          重設
        </button>
      }
      trailing={
        <button type="button" onClick={onClose} className="min-h-11 px-1 text-[17px] font-semibold text-tint">
          完成
        </button>
      }
    >
      <ListSection>
        <ListRow label="只顯示收藏" accessory={<Switch label="只顯示收藏" checked={value.starredOnly} onChange={(v) => onChange({ ...value, starredOnly: v })} />} />
        <ListRow label="只顯示今日到期" accessory={<Switch label="只顯示今日到期" checked={value.dueOnly} onChange={(v) => onChange({ ...value, dueOnly: v })} />} />
      </ListSection>

      <section className="mb-8">
        <h3 className="mb-2.5 px-4 text-[13px] font-medium text-ink-2">學習狀態</h3>
        <div className="flex flex-wrap gap-2">
          {states.map((s) => (
            <Chip key={s} active={value.states.includes(s)} onClick={() => onChange({ ...value, states: toggle(value.states, s) })}>
              {stateLabel[s]}
            </Chip>
          ))}
        </div>
      </section>

      {showDecks && decks.length > 0 && (
        <section className="mb-8">
          <h3 className="mb-2.5 px-4 text-[13px] font-medium text-ink-2">牌組</h3>
          <div className="flex flex-wrap gap-2">
            <Chip active={value.deckId === 'all'} onClick={() => onChange({ ...value, deckId: 'all' })}>
              全部
            </Chip>
            {decks.map((d) => (
              <Chip key={d.id} active={value.deckId === d.id} onClick={() => onChange({ ...value, deckId: d.id })}>
                <span className="size-2 rounded-full" style={{ background: getColor(d.color).solid }} aria-hidden />
                {d.name}
              </Chip>
            ))}
          </div>
        </section>
      )}

      {showTags && tags.length > 0 && (
        <section>
          <h3 className="mb-2.5 px-4 text-[13px] font-medium text-ink-2">標籤（符合任一個）</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Chip key={t.id} active={value.tagIds.includes(t.id)} onClick={() => onChange({ ...value, tagIds: toggle(value.tagIds, t.id) })}>
                <TagIcon color={t.color} size={16} />
                {t.name}
              </Chip>
            ))}
          </div>
        </section>
      )}
    </Modal>
  )
}
