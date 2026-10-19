import { Link } from 'react-router-dom'
import { NotebookPen } from 'lucide-react'
import { useCards, useDecks, useTags } from '../hooks/useData'
import { NoteBrowser } from '../components/notes/NoteBrowser'
import { NotesSegment } from '../components/notes/NotesSegment'
import { EmptyState } from '../components/ui/EmptyState'
import { buttonClasses } from '../components/ui/buttonStyles'

export function NotesPage() {
  const cards = useCards()
  const decks = useDecks()
  const tags = useTags()

  return (
    <NoteBrowser
      cards={cards}
      decks={decks}
      tags={tags}
      title="筆記"
      emptyState={
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
      }
    >
      <NotesSegment value="notes" />
    </NoteBrowser>
  )
}
