import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Clock3, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCards, useDecks, useTags } from '../hooks/useData'
import { useNow } from '../hooks/useEnvironment'
import { useSettings } from '../store/settings'
import { confirmDialog, toast } from '../store/ui'
import { deleteDeck } from '../db/repo'
import { computeDeckStats } from '../lib/deckStats'
import { NoteBrowser } from '../components/notes/NoteBrowser'
import { DeckFormDialog } from '../components/deck/DeckFormDialog'
import { DeckCover } from '../components/deck/DeckCover'
import { EmptyState } from '../components/ui/EmptyState'
import { buttonClasses } from '../components/ui/buttonStyles'

export function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()
  const decks = useDecks()
  const allCards = useCards()
  const tags = useTags()
  const now = useNow()
  const dayStartHour = useSettings((s) => s.dayStartHour)
  const [editOpen, setEditOpen] = useState(false)

  const deck = decks?.find((d) => d.id === deckId)
  const cards = useMemo(() => allCards?.filter((c) => c.deckId === deckId), [allCards, deckId])

  if (decks && !deck) {
    return (
      <EmptyState
        icon={<Layers size={28} />}
        title="找不到這個牌組"
        description="它可能已被刪除。"
        action={
          <Link to="/decks" className={buttonClasses({ variant: 'secondary' })}>
            回到牌組
          </Link>
        }
        className="min-h-[60dvh]"
      />
    )
  }

  const stats = computeDeckStats(cards ?? [], now, dayStartHour)

  async function remove() {
    if (!deck) return
    const ok = await confirmDialog({
      title: `刪除「${deck.name}」？`,
      message: stats.total
        ? `牌組內的 ${stats.total} 張卡片與複習紀錄也會一併刪除，且無法復原。建議先匯出備份。`
        : '這個牌組是空的。',
      confirmLabel: '刪除牌組',
      destructive: true,
    })
    if (!ok) return
    navigate('/decks', { replace: true })
    await deleteDeck(deck.id)
    toast(`已刪除「${deck.name}」`)
  }

  return (
    <>
      <NoteBrowser
        cards={cards}
        decks={decks}
        tags={tags}
        back="/decks"
        title={deck?.name ?? ''}
        subtitle={deck?.description || undefined}
        showDeckOnCards={false}
        showDeckFilter={false}
        menuItems={[
          { label: '編輯牌組', icon: <Pencil size={18} />, separated: true, onSelect: () => setEditOpen(true) },
          { label: '刪除牌組', icon: <Trash2 size={18} />, destructive: true, onSelect: () => void remove() },
        ]}
        emptyState={
          <EmptyState
            icon={<Plus size={28} />}
            title="這個牌組還沒有卡片"
            description="新增卡片後，就能在這裡管理並開始複習。"
          />
        }
      >
        {deck && (
          <section className="mb-6 overflow-hidden rounded-[22px] bg-surface shadow-card" aria-label="牌組概況">
            <DeckCover deck={deck} className="aspect-[16/7] w-full sm:aspect-auto sm:h-56" />
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <dl className="grid flex-1 grid-cols-4 gap-2 text-center">
                {[
                  { label: '新卡片', value: stats.newCount, cls: 'text-tint' },
                  { label: '學習中', value: stats.learningCount, cls: 'text-[#E5352B] dark:text-[#FF6961]' },
                  { label: '今日到期', value: stats.dueToday, cls: 'text-[#1F8A3C] dark:text-success' },
                  { label: '總數', value: stats.total, cls: 'text-ink' },
                ].map((s) => (
                  <div key={s.label}>
                    <dt className="text-[12px] text-ink-2">{s.label}</dt>
                    <dd className={`text-[22px] font-semibold tabular-nums ${s.cls}`}>{s.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <Link to={`/record?deck=${deck.id}`} className={buttonClasses({ variant: 'secondary' })}>
                  <Plus size={18} aria-hidden />
                  新增卡片
                </Link>
                <Link
                  to={`/review?deck=${deck.id}`}
                  aria-disabled={stats.total === 0}
                  className={buttonClasses({ variant: 'brand', className: stats.total === 0 ? 'pointer-events-none opacity-40' : '' })}
                >
                  <Clock3 size={18} aria-hidden />
                  開始複習
                </Link>
              </div>
            </div>
          </section>
        )}
      </NoteBrowser>

      <DeckFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        deck={deck}
        existingNames={(decks ?? []).map((d) => d.name)}
      />
    </>
  )
}
