import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Ellipsis, Layers, Plus, Upload } from 'lucide-react'
import { useCards, useDecks } from '../hooks/useData'
import { useNow } from '../hooks/useEnvironment'
import { useSettings } from '../store/settings'
import { computeDeckStats, groupByDeck } from '../lib/deckStats'
import { deckLanguage, languageFilterLabels } from '../lib/cardLanguage'
import { useNotesLanguage } from '../store/notesLanguage'
import { PageHeader } from '../components/layout/PageHeader'
import { NotesSegment } from '../components/notes/NotesSegment'
import { DeckCard } from '../components/deck/DeckCard'
import { DeckFormDialog } from '../components/deck/DeckFormDialog'
import { GlassButton } from '../components/ui/GlassButton'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Controls'
import { SearchField } from '../components/ui/Field'
import { Menu } from '../components/ui/Menu'
import { IMPORT_ACCEPT, ImportSheet, readImportFile, type PendingImport } from '../components/settings/DataSheets'
import { backupFilename, downloadBlob, exportBackupBlob } from '../db/backup'
import { getSettings } from '../store/settings'
import { toast } from '../store/ui'

export function DecksPage() {
  const navigate = useNavigate()
  const decks = useDecks()
  const cards = useCards()
  const now = useNow()
  const dayStartHour = useSettings((s) => s.dayStartHour)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [query, setQuery] = useState('')
  const language = useNotesLanguage((s) => s.language)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingImport | null>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      setPending(await readImportFile(file))
    } catch (e) {
      toast(e instanceof Error ? e.message : '無法讀取檔案', { tone: 'error' })
    }
  }

  async function exportAll() {
    try {
      downloadBlob(await exportBackupBlob(getSettings()), backupFilename())
      toast('已匯出全部牌組與學習進度', { tone: 'success' })
    } catch (e) {
      console.error(e)
      toast('匯出失敗', { tone: 'error' })
    }
  }

  const byDeck = useMemo(() => groupByDeck(cards ?? []), [cards])
  const visible = (decks ?? []).filter(
    (d) =>
      (language === 'all' || deckLanguage(byDeck.get(d.id) ?? []) === language) &&
      d.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div>
      <PageHeader
        title="牌組"
        trailing={
          <div className="flex items-center gap-2">
            <Menu
              label="匯入與匯出"
              items={[
                { label: '匯入牌組或備份', icon: <Upload size={18} />, onSelect: () => fileRef.current?.click() },
                { label: '匯出全部（含學習進度）', icon: <Download size={18} />, disabled: !decks?.length, onSelect: () => void exportAll() },
              ]}
              trigger={(p) => (
                <GlassButton {...p} round aria-label="匯入與匯出">
                  <Ellipsis size={22} />
                </GlassButton>
              )}
            />
            <GlassButton round aria-label="新增牌組" onClick={() => setDialogOpen(true)}>
              <Plus size={24} />
            </GlassButton>
          </div>
        }
      />
      <NotesSegment />

      {decks && decks.length > 3 && <SearchField value={query} onChange={setQuery} placeholder="搜尋牌組" className="mb-4" />}

      {!decks || !cards ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-[340px] rounded-[22px]" />
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
          <p className="mb-3 px-1 text-[15px] font-medium text-ink-2">
            {language === 'all' ? `${visible.length} 個牌組` : `${visible.length} 個${languageFilterLabels[language]}牌組`}
          </p>
          {visible.length === 0 && language !== 'all' && (
            <p className="px-1 py-8 text-center text-[15px] text-ink-2">沒有以{languageFilterLabels[language]}為主的牌組</p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((deck) => (
              <DeckCard key={deck.id} deck={deck} stats={computeDeckStats(byDeck.get(deck.id) ?? [], now, dayStartHour)} />
            ))}
          </div>
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={IMPORT_ACCEPT}
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <ImportSheet pending={pending} onClose={() => setPending(null)} decks={decks ?? []} />
      <DeckFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        existingNames={(decks ?? []).map((d) => d.name)}
        onCreated={(d) => navigate(`/decks/${d.id}`)}
      />
    </div>
  )
}
