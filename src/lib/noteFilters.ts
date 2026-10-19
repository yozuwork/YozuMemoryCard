import type { CardState, Flashcard } from '../types/card'

export type SortKey = 'createdAt' | 'updatedAt' | 'due' | 'front' | 'reps'
export type SortDir = 'asc' | 'desc'

export const sortLabels: Record<SortKey, string> = {
  createdAt: '製作日期',
  updatedAt: '修改日期',
  due: '到期時間',
  front: '字母順序',
  reps: '複習次數',
}

export interface NoteFilter {
  deckId: string | 'all'
  states: CardState[]
  tagIds: string[]
  starredOnly: boolean
  dueOnly: boolean
}

export const emptyFilter: NoteFilter = { deckId: 'all', states: [], tagIds: [], starredOnly: false, dueOnly: false }

export function activeFilterCount(f: NoteFilter): number {
  return (f.deckId !== 'all' ? 1 : 0) + (f.states.length ? 1 : 0) + (f.tagIds.length ? 1 : 0) + (f.starredOnly ? 1 : 0) + (f.dueOnly ? 1 : 0)
}

export function filterNotes(cards: Flashcard[], query: string, f: NoteFilter, dueBefore: number): Flashcard[] {
  const q = query.trim().toLowerCase()
  return cards.filter((c) => {
    if (f.deckId !== 'all' && c.deckId !== f.deckId) return false
    if (f.states.length && !f.states.includes(c.state)) return false
    if (f.tagIds.length && !f.tagIds.some((t) => c.tagIds.includes(t))) return false
    if (f.starredOnly && !c.starred) return false
    if (f.dueOnly && (c.state === 0 || c.due >= dueBefore)) return false
    if (q && ![c.front, c.back, c.hint, c.extra].some((s) => s.toLowerCase().includes(q))) return false
    return true
  })
}

const collator = new Intl.Collator('zh-Hant', { numeric: true, sensitivity: 'base' })

export function sortNotes(cards: Flashcard[], key: SortKey, dir: SortDir): Flashcard[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...cards].sort((a, b) => {
    const diff = key === 'front' ? collator.compare(a.front, b.front) : a[key] - b[key]
    return diff !== 0 ? diff * sign : b.createdAt - a.createdAt
  })
}
