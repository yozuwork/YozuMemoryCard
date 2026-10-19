import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus } from 'lucide-react'
import { useCards, useDecks } from '../hooks/useData'
import { useNow } from '../hooks/useEnvironment'
import { useSettings } from '../store/settings'
import { computeDeckStats, groupByDeck } from '../lib/deckStats'
import { PageHeader } from '../components/layout/PageHeader'
import { NotesSegment } from '../components/notes/NotesSegment'
import { DeckCard } from '../components/deck/DeckCard'
import { DeckFormDialog } from '../components/deck/DeckFormDialog'
import { GlassButton } from '../components/ui/GlassButton'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Controls'
import { SearchField } from '../components/ui/Field'

export function DecksPage() {
  const navigate = useNavigate()
  const decks = useDecks()
  const cards = useCards()
  const now = useNow()
  const dayStartHour = useSettings((s) => s.dayStartHour)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [query, setQuery] = useState('')

  const byDeck = useMemo(() => groupByDeck(cards ?? []), [cards])
  const visible = (decks ?? []).filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div>
      <PageHeader
        title="筆記"
        trailing={
          <GlassButton round aria-label="新增牌組" onClick={() => setDialogOpen(true)}>
            <Plus size={24} />
          </GlassButton>
        }
      />
      <NotesSegment value="decks" />

      {decks && decks.length > 3 && <SearchField value={query} onChange={setQuery} placeholder="搜尋牌組" className="mb-4" />}

      {!decks || !cards ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-[196px] rounded-[22px]" />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <EmptyState
          icon={<Layers size={28} />}
          title="還沒有牌組"
          description="用牌組把卡片分門別類，例如「英文單字」或「期中考」。"
          action={
            <Button variant="brand" icon={<Plus size={18} />} onClick={() => setDialogOpen(true)}>
              建立牌組
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-3 px-1 text-[15px] font-medium text-ink-2">{visible.length} 個牌組</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((deck) => (
              <DeckCard key={deck.id} deck={deck} stats={computeDeckStats(byDeck.get(deck.id) ?? [], now, dayStartHour)} />
            ))}
          </div>
        </>
      )}

      <DeckFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        existingNames={(decks ?? []).map((d) => d.name)}
        onCreated={(d) => navigate(`/decks/${d.id}`)}
      />
    </div>
  )
}
