import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownUp, CheckCheck, ChevronDown, Ellipsis, FolderInput, ListFilter, Search, Trash2, Volume2 } from 'lucide-react'
import type { Flashcard } from '../../types/card'
import type { Deck, Tag } from '../../types/deck'
import { CardListItem } from '../card/CardListItem'
import { FilterSheet } from './FilterSheet'
import { PageHeader } from '../layout/PageHeader'
import { GlassButton } from '../ui/GlassButton'
import { SearchField } from '../ui/Field'
import { Menu, type MenuItem } from '../ui/Menu'
import { Modal } from '../ui/Modal'
import { Skeleton } from '../ui/Controls'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { deleteCards, moveCards } from '../../db/repo'
import { activeFilterCount, emptyFilter, filterNotes, sortLabels, sortNotes, type NoteFilter, type SortDir, type SortKey } from '../../lib/noteFilters'
import { retrievability } from '../../lib/scheduler'
import { studyDayBounds } from '../../lib/time'
import { getColor } from '../../lib/deckColors'
import { useSettings } from '../../store/settings'
import { usePlayer } from '../../store/player'
import { confirmDialog, toast } from '../../store/ui'
import { useNow } from '../../hooks/useEnvironment'
import { isSpeechSupported } from '../../lib/speech'

const PAGE = 60
const SORT_KEY = 'yozuanki-note-sort'

function readSort(): { key: SortKey; dir: SortDir } {
  try {
    const v = JSON.parse(localStorage.getItem(SORT_KEY) ?? '')
    if (v && v.key in sortLabels && (v.dir === 'asc' || v.dir === 'desc')) return v
  } catch {
    /* default */
  }
  return { key: 'createdAt', dir: 'desc' }
}

interface NoteBrowserProps {
  cards: Flashcard[] | undefined
  decks: Deck[] | undefined
  tags: Tag[] | undefined
  title: ReactNode
  subtitle?: ReactNode
  back?: string | true
  /** Extra items for the "…" menu (e.g. edit / delete deck). */
  menuItems?: MenuItem[]
  /** Content between the title and the search field. */
  children?: ReactNode
  showDeckOnCards?: boolean
  showDeckFilter?: boolean
  showTagFilter?: boolean
  emptyState: ReactNode
}

export function NoteBrowser({
  cards,
  decks,
  tags,
  title,
  subtitle,
  back,
  menuItems = [],
  children,
  showDeckOnCards = true,
  showDeckFilter = true,
  showTagFilter = true,
  emptyState,
}: NoteBrowserProps) {
  const navigate = useNavigate()
  const now = useNow(60_000)
  const retentionTarget = useSettings((s) => s.retention)
  const dayStartHour = useSettings((s) => s.dayStartHour)
  const startPlayer = usePlayer((s) => s.start)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<NoteFilter>(emptyFilter)
  const [sort, setSort] = useState(readSort)
  const [filterOpen, setFilterOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [rawSelected, setSelected] = useState<Set<string>>(() => new Set())
  const [paging, setPaging] = useState({ key: '', limit: PAGE })
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(SORT_KEY, JSON.stringify(sort))
    } catch {
      /* ignore */
    }
  }, [sort])

  const { end: dayEnd } = studyDayBounds(now, dayStartHour)
  const visible = useMemo(
    () => (cards ? sortNotes(filterNotes(cards, query, filter, dayEnd), sort.key, sort.dir) : undefined),
    [cards, query, filter, dayEnd, sort],
  )
  const deckById = useMemo(() => new Map((decks ?? []).map((d) => [d.id, d])), [decks])

  // Render progressively for large collections; any change of view starts over.
  const viewKey = JSON.stringify([query, filter, sort])
  const limit = paging.key === viewKey ? paging.limit : PAGE
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setPaging({ key: viewKey, limit: limit + PAGE })
      },
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible, viewKey, limit])

  // Only cards still on screen count as selected (others were deleted / filtered out).
  const selected = useMemo(() => {
    if (!visible || rawSelected.size === 0) return rawSelected
    const ids = new Set(visible.map((c) => c.id))
    return new Set([...rawSelected].filter((id) => ids.has(id)))
  }, [visible, rawSelected])

  function exitSelection() {
    setSelecting(false)
    setSelected(new Set())
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function removeOne(card: Flashcard) {
    const ok = await confirmDialog({
      title: `刪除「${card.front.slice(0, 24) || '這張卡片'}」？`,
      message: '卡片與它的複習紀錄會被永久刪除。',
      confirmLabel: '刪除',
      destructive: true,
    })
    if (!ok) return
    await deleteCards([card.id])
    toast('已刪除 1 張卡片')
  }

  async function removeSelected() {
    const ids = [...selected]
    if (!ids.length) return
    const ok = await confirmDialog({
      title: `刪除 ${ids.length} 張卡片？`,
      message: '卡片與它們的複習紀錄會被永久刪除。',
      confirmLabel: '刪除',
      destructive: true,
    })
    if (!ok) return
    await deleteCards(ids)
    toast(`已刪除 ${ids.length} 張卡片`)
    exitSelection()
  }

  async function moveSelected(deckId: string) {
    const ids = [...selected]
    await moveCards(ids, deckId)
    setMoveOpen(false)
    toast(`已移動 ${ids.length} 張卡片到「${deckById.get(deckId)?.name ?? ''}」`, { tone: 'success' })
    exitSelection()
  }

  const filterCount = activeFilterCount(filter)
  const allSelected = Boolean(visible?.length) && selected.size === visible!.length

  const moreItems: MenuItem[] = [
    {
      label: '朗讀這些筆記',
      icon: <Volume2 size={18} />,
      disabled: !visible?.length || !isSpeechSupported(),
      onSelect: () => visible && startPlayer(visible.map((c) => c.id)),
    },
    { label: '選取多張', icon: <CheckCheck size={18} />, disabled: !visible?.length, onSelect: () => setSelecting(true) },
    ...menuItems,
  ]

  const sortItems: MenuItem[] = [
    ...(Object.keys(sortLabels) as SortKey[]).map((k) => ({
      label: `按${sortLabels[k]}排序`,
      checked: sort.key === k,
      onSelect: () => setSort((s) => ({ key: k, dir: s.key === k ? s.dir : k === 'front' || k === 'due' ? 'asc' : 'desc' })),
    })),
    {
      label: sort.dir === 'desc' ? '目前：由新到舊 / 大到小' : '目前：由舊到新 / 小到大',
      icon: <ArrowDownUp size={17} />,
      separated: true,
      onSelect: () => setSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' })),
    },
  ]

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        back={back}
        leading={
          <GlassButton onClick={() => (selecting ? exitSelection() : setSelecting(true))} active={selecting} disabled={!cards?.length}>
            {selecting ? '完成' : '編輯'}
          </GlassButton>
        }
        trailing={
          <div className="glass flex h-11 items-center rounded-full shadow-[0_2px_10px_rgb(0_0_0/0.06)]">
            <Menu
              label="更多操作"
              items={moreItems}
              trigger={(p) => (
                <button {...p} type="button" aria-label="更多操作" className="flex h-11 w-12 items-center justify-center rounded-full text-ink">
                  <Ellipsis size={22} />
                </button>
              )}
            />
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label={filterCount ? `篩選（已套用 ${filterCount} 項）` : '篩選'}
              className="relative flex h-11 w-12 items-center justify-center rounded-full text-ink"
            >
              <ListFilter size={21} />
              {filterCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-tint text-[10px] font-bold text-white">
                  {filterCount}
                </span>
              )}
            </button>
          </div>
        }
      />

      {children}

      {cards && cards.length > 0 && <SearchField value={query} onChange={setQuery} placeholder="搜尋筆記" className="mb-4" />}

      {!visible ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="載入中">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[148px] rounded-[22px]" />
          ))}
        </div>
      ) : cards!.length === 0 ? (
        emptyState
      ) : (
        <>
          <div className="mb-3 flex min-h-11 items-center justify-between px-1">
            <p className="text-[15px] font-medium text-ink-2" aria-live="polite">
              {selecting ? `已選取 ${selected.size} 張` : `${visible.length} 條筆記`}
            </p>
            {selecting ? (
              <button
                type="button"
                onClick={() => setSelected(allSelected ? new Set() : new Set(visible.map((c) => c.id)))}
                className="min-h-11 text-[15px] font-medium text-tint"
              >
                {allSelected ? '取消全選' : '全選'}
              </button>
            ) : (
              <Menu
                label="排序方式"
                items={sortItems}
                trigger={(p) => (
                  <button {...p} type="button" className="flex min-h-11 items-center gap-1 text-[15px] font-medium text-ink-2">
                    按{sortLabels[sort.key]}排序
                    <ChevronDown size={17} aria-hidden />
                  </button>
                )}
              />
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={<Search size={26} />}
              title="找不到符合的筆記"
              description="試試其他關鍵字，或調整篩選條件。"
              action={
                <Button variant="secondary" size="sm" onClick={() => { setQuery(''); setFilter(emptyFilter) }}>
                  清除搜尋與篩選
                </Button>
              }
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {visible.slice(0, limit).map((card) => (
                  <motion.li
                    key={card.id}
                    layout="position"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    className="h-full"
                  >
                    <CardListItem
                      card={card}
                      deck={showDeckOnCards ? deckById.get(card.deckId) : undefined}
                      tags={tags ?? []}
                      retention={retrievability(card, now, retentionTarget)}
                      dateLabelFrom={sort.key === 'updatedAt' ? 'updatedAt' : 'createdAt'}
                      selecting={selecting}
                      selected={selected.has(card.id)}
                      onOpen={() => navigate(`/notes/card/${card.id}`)}
                      onToggleSelect={() => toggleSelect(card.id)}
                      onLongPress={() => {
                        setSelecting(true)
                        setSelected(new Set([card.id]))
                      }}
                      onDelete={() => void removeOne(card)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
          {visible.length > limit && <div ref={sentinel} className="h-10" aria-hidden />}
        </>
      )}

      {/* Bulk actions while selecting */}
      <AnimatePresence>
        {selecting && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="tabbar fixed inset-x-0 z-40 flex justify-center px-4 bottom-[calc(max(var(--safe-bottom),12px)+var(--tabbar-h)+10px)] lg:bottom-6 lg:left-[248px]"
          >
            <div className="glass flex w-full max-w-[460px] items-center gap-2 rounded-[22px] p-2 shadow-float" role="toolbar" aria-label="批次操作">
              <Button variant="secondary" size="md" className="flex-1" disabled={!selected.size} onClick={() => setMoveOpen(true)} icon={<FolderInput size={18} />}>
                移動
              </Button>
              <Button variant="danger" size="md" className="flex-1" disabled={!selected.size} onClick={() => void removeSelected()} icon={<Trash2 size={18} />}>
                刪除{selected.size ? ` ${selected.size}` : ''}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filter}
        onChange={setFilter}
        decks={decks ?? []}
        tags={tags ?? []}
        showDecks={showDeckFilter}
        showTags={showTagFilter}
      />

      <Modal open={moveOpen} onClose={() => setMoveOpen(false)} title={`移動 ${selected.size} 張卡片到…`}>
        <div className="overflow-hidden rounded-[18px] bg-surface">
          {(decks ?? []).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => void moveSelected(d.id)}
              className="list-row flex w-full items-center gap-3 pl-4 text-left active:bg-fill-2"
            >
              <span className="size-3 shrink-0 rounded-full" style={{ background: getColor(d.color).solid }} aria-hidden />
              <span className="list-row-body flex min-h-[52px] flex-1 items-center pr-4 text-[16px] text-ink">{d.name}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
