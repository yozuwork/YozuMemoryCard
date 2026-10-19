import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import clsx from 'clsx'
import { Modal } from '../ui/Modal'
import { SearchField } from '../ui/Field'
import { TagIcon } from '../tags/TagIcon'
import { createTag } from '../../db/repo'
import { colorNames } from '../../lib/deckColors'
import type { Tag } from '../../types/deck'

interface TagPickerProps {
  open: boolean
  onClose: () => void
  tags: Tag[]
  selected: string[]
  onChange: (ids: string[]) => void
}

export function TagPicker({ open, onClose, tags, selected, onChange }: TagPickerProps) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const visible = q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags
  const exact = tags.some((t) => t.name.toLowerCase() === q)

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])

  async function create() {
    const tag = await createTag({ name: query.trim(), color: colorNames[tags.length % colorNames.length] })
    onChange([...selected, tag.id])
    setQuery('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="標籤"
      trailing={
        <button type="button" onClick={onClose} className="min-h-11 px-1 text-[17px] font-semibold text-tint">
          完成
        </button>
      }
    >
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="搜尋或建立標籤"
        className="mb-4"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && q && !exact) {
            e.preventDefault()
            void create()
          }
        }}
      />
      <div className="overflow-hidden rounded-[18px] bg-surface">
        {q && !exact && (
          <button type="button" onClick={() => void create()} className="list-row flex w-full items-center gap-3 pl-4 text-left active:bg-fill-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-tint text-white">
              <Plus size={16} strokeWidth={2.6} />
            </span>
            <span className="list-row-body flex min-h-[52px] flex-1 items-center pr-4 text-[16px] text-tint">
              建立標籤「{query.trim()}」
            </span>
          </button>
        )}
        {visible.map((t) => {
          const on = selected.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(t.id)}
              className="list-row flex w-full items-center gap-3 pl-4 text-left active:bg-fill-2"
            >
              <TagIcon color={t.color} size={22} />
              <span className="list-row-body flex min-h-[52px] flex-1 items-center gap-3 pr-4">
                <span className="flex-1 truncate text-[16px] text-ink">{t.name}</span>
                <span
                  className={clsx(
                    'flex size-6 items-center justify-center rounded-full border-[1.5px] transition-colors',
                    on ? 'border-tint bg-tint text-white' : 'border-ink-3',
                  )}
                >
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
              </span>
            </button>
          )
        })}
        {visible.length === 0 && !q && <p className="px-4 py-6 text-center text-[15px] text-ink-2">輸入名稱建立第一個標籤</p>}
      </div>
    </Modal>
  )
}
