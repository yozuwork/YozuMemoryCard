import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Languages, NotebookPen } from 'lucide-react'
import { useCards, useDecks, useTags } from '../hooks/useData'
import { languageFilterLabels, matchesLanguage } from '../lib/cardLanguage'
import { useNotesLanguage } from '../store/notesLanguage'
import { NoteBrowser } from '../components/notes/NoteBrowser'
import { NotesSegment } from '../components/notes/NotesSegment'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { buttonClasses } from '../components/ui/buttonStyles'

export function NotesPage() {
  const cards = useCards()
  const decks = useDecks()
  const tags = useTags()
  const language = useNotesLanguage((s) => s.language)
  const setLanguage = useNotesLanguage((s) => s.setLanguage)

  const shown = useMemo(() => cards?.filter((c) => matchesLanguage(c, language)), [cards, language])

  return (
    <NoteBrowser
      cards={shown}
      decks={decks}
      tags={tags}
      title="筆記"
      emptyState={
        cards && cards.length > 0 ? (
          <EmptyState
            icon={<Languages size={28} />}
            title={`沒有${languageFilterLabels[language]}筆記`}
            description="語言依卡片正面判斷：含假名或只有漢字為日文，只有英文字母為英文。"
            action={
              <Button variant="secondary" size="sm" onClick={() => setLanguage('all')}>
                顯示全部
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<NotebookPen size={28} />}
            title="還沒有任何筆記"
            description="每張卡片都是一則筆記。到「記錄」新增，或從「選項」匯入資料。"
            action={
              <Link to="/record" className={buttonClasses({ variant: 'brand' })}>
                新增第一張卡片
              </Link>
            }
          />
        )
      }
    >
      <NotesSegment value="notes" />
    </NoteBrowser>
  )
}
