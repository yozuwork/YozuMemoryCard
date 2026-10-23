import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { ChevronDown, ChevronLeft, RotateCcw, Star, Tag as TagIcon, Trash2, Ellipsis, Volume2 } from 'lucide-react'
import { useCard, useDecks, useTags } from '../hooks/useData'
import { useUnsavedGuard } from '../hooks/useUnsavedGuard'
import { useSpeech } from '../hooks/useSpeech'
import { exampleSpeechText } from '../lib/speech'
import { deleteCards, ensureDeck, resetCards, saveCard } from '../db/repo'
import { confirmDialog, toast } from '../store/ui'
import { getColor } from '../lib/deckColors'
import { stateLabel } from '../lib/ratings'
import { formatRelativeFuture } from '../lib/time'
import { CardState, type Flashcard } from '../types/card'
import type { Deck, Tag } from '../types/deck'
import { EditorBlock, ImagePreview } from '../components/editor/EditorBlock'
import { TagPicker } from '../components/editor/TagPicker'
import { DeckSelect } from '../components/editor/DeckSelect'
import { TextArea } from '../components/ui/Field'
import { Menu } from '../components/ui/Menu'
import { Skeleton } from '../components/ui/Controls'
import { EmptyState } from '../components/ui/EmptyState'

const LAST_DECK_KEY = 'yozuanki-editor-deck'

interface FormState {
  deckId: string
  front: string
  back: string
  hint: string
  extra: string
  tagIds: string[]
  starred: boolean
  /** undefined = unchanged, null = removed, Blob = new image */
  frontBlob: Blob | null | undefined
  backBlob: Blob | null | undefined
}

function fromCard(card: Flashcard): FormState {
  return {
    deckId: card.deckId,
    front: card.front,
    back: card.back,
    hint: card.hint,
    extra: card.extra,
    tagIds: card.tagIds,
    starred: card.starred,
    frontBlob: undefined,
    backBlob: undefined,
  }
}

function blank(deckId: string, tagIds: string[] = []): FormState {
  return { deckId, front: '', back: '', hint: '', extra: '', tagIds, starred: false, frontBlob: undefined, backBlob: undefined }
}

function sameForm(a: FormState, b: FormState) {
  return (
    a.deckId === b.deckId &&
    a.front === b.front &&
    a.back === b.back &&
    a.hint === b.hint &&
    a.extra === b.extra &&
    a.starred === b.starred &&
    a.frontBlob === b.frontBlob &&
    a.backBlob === b.backBlob &&
    a.tagIds.length === b.tagIds.length &&
    a.tagIds.every((t) => b.tagIds.includes(t))
  )
}

function readLastDeck() {
  try {
    return localStorage.getItem(LAST_DECK_KEY) ?? ''
  } catch {
    return ''
  }
}

/** Remounts the editor when switching between cards so its form state resets. */
export function EditCardRoute() {
  const { cardId } = useParams()
  return <CardEditorPage key={cardId} />
}

export function CardEditorPage() {
  const { cardId } = useParams<{ cardId?: string }>()
  const card = useCard(cardId)
  const decks = useDecks()
  const tags = useTags()

  if (cardId && card === null) {
    return (
      <EmptyState
        icon={<Trash2 size={26} />}
        title="找不到這張卡片"
        description="它可能已被刪除。"
        className="min-h-[60dvh]"
      />
    )
  }
  if (!decks || !tags || (cardId && !card)) {
    return (
      <div className="flex flex-col gap-4 pt-16" aria-busy="true">
        <Skeleton className="h-40 w-full rounded-[18px]" />
        <Skeleton className="h-72 w-full rounded-[18px]" />
      </div>
    )
  }
  return <Editor card={card ?? undefined} decks={decks} tags={tags} />
}

function Editor({ card, decks, tags }: { card: Flashcard | undefined; decks: Deck[]; tags: Tag[] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(card)

  const initialDeck = useMemo(() => {
    const requested = searchParams.get('deck')
    if (requested && decks.some((d) => d.id === requested)) return requested
    const last = readLastDeck()
    return decks.some((d) => d.id === last) ? last : (decks[0]?.id ?? '')
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [baseline, setBaseline] = useState<FormState>(() => (card ? fromCard(card) : blank(initialDeck)))
  const [form, setForm] = useState<FormState>(baseline)
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [extraOpen, setExtraOpen] = useState(Boolean(card?.extra))
  const frontRef = useRef<HTMLTextAreaElement>(null)
  const speech = useSpeech()
  const speakButton = (text: string, label: string) =>
    speech.supported &&
    text.trim() && (
      <button
        type="button"
        onClick={() => void speech.say(text)}
        aria-label={label}
        className="flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-fill-2 hover:text-ink"
      >
        <Volume2 size={21} />
      </button>
    )

  const dirty = !sameForm(form, baseline)
  const { allowNext } = useUnsavedGuard(dirty && !saving)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const hasFront = form.front.trim() !== '' || form.frontBlob instanceof Blob || (form.frontBlob === undefined && Boolean(card?.frontImage))
  const hasBack = form.back.trim() !== '' || form.backBlob instanceof Blob || (form.backBlob === undefined && Boolean(card?.backImage))
  const frontError = tried && !hasFront ? '請輸入正面內容或加入圖片' : undefined
  const backError = tried && !hasBack ? '請輸入想記住的內容或加入圖片' : undefined

  function leave() {
    allowNext()
    // Return to wherever the editor was opened from (review, a deck, a tag…).
    if (location.key !== 'default') navigate(-1)
    else navigate('/notes')
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    setTried(true)
    if (!hasFront || !hasBack) {
      ;(hasFront ? document.getElementById('card-back') : frontRef.current)?.focus()
      return
    }
    setSaving(true)
    try {
      const deckId = await ensureDeck(form.deckId)
      const saved = await saveCard(
        card?.id ?? null,
        {
          deckId,
          front: form.front.trim(),
          back: form.back.trim(),
          hint: form.hint.trim(),
          extra: form.extra.trim(),
          tagIds: form.tagIds.filter((id) => tags.some((t) => t.id === id)),
          starred: form.starred,
        },
        { front: form.frontBlob, back: form.backBlob },
      )
      try {
        localStorage.setItem(LAST_DECK_KEY, deckId)
      } catch {
        /* ignore */
      }
      if (isEdit) {
        toast('已儲存變更', { tone: 'success' })
        leave()
      } else {
        const next = blank(deckId, form.tagIds)
        setBaseline(next)
        setForm(next)
        setTried(false)
        setExtraOpen(false)
        toast('已新增卡片', {
          tone: 'success',
          action: { label: '查看', run: () => navigate(`/notes/card/${saved.id}`) },
        })
        frontRef.current?.focus()
      }
    } catch (err) {
      console.error(err)
      toast('儲存失敗，請再試一次', { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!card) return
    const ok = await confirmDialog({
      title: '刪除這張卡片？',
      message: '卡片、圖片與複習紀錄都會一併刪除，且無法復原。',
      confirmLabel: '刪除',
      destructive: true,
    })
    if (!ok) return
    await deleteCards([card.id])
    toast('已刪除卡片')
    leave()
  }

  async function reset() {
    if (!card) return
    const ok = await confirmDialog({
      title: '重設學習進度？',
      message: '這張卡片會回到「新卡片」狀態，複習紀錄會保留。',
      confirmLabel: '重設',
      destructive: true,
    })
    if (!ok) return
    await resetCards([card.id])
    toast('已重設學習進度')
  }

  async function clearForm() {
    if (dirty) {
      const ok = await confirmDialog({ title: '清除目前輸入的內容？', confirmLabel: '清除', destructive: true })
      if (!ok) return
    }
    setForm(baseline)
    setTried(false)
  }

  // ⌘/Ctrl + Enter saves from anywhere in the form.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        void submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const selectedTags = tags.filter((t) => form.tagIds.includes(t.id))

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-[1040px]" aria-label={isEdit ? '編輯卡片' : '新增卡片'}>
      {/* Toolbar */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 flex min-h-[60px] items-center gap-1 bg-canvas/85 px-4 pt-[var(--safe-top)] backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mb-6 lg:bg-transparent lg:px-0 lg:pt-0 lg:backdrop-blur-none">
        {isEdit && (
          <button
            type="button"
            onClick={leave}
            className="-ml-2 flex min-h-11 items-center gap-0.5 pr-2 text-[17px] text-tint"
          >
            <ChevronLeft size={24} />
            取消
          </button>
        )}
        <button
          type="button"
          onClick={() => set('starred', !form.starred)}
          aria-pressed={form.starred}
          aria-label={form.starred ? '取消收藏' : '收藏'}
          className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-fill-2"
        >
          <motion.span key={String(form.starred)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 18 }}>
            <Star
              size={24}
              className={form.starred ? 'text-[#FFB300]' : 'text-ink'}
              fill={form.starred ? '#FFC53D' : 'none'}
              strokeWidth={form.starred ? 1.5 : 2}
            />
          </motion.span>
        </button>
        <button
          type="button"
          onClick={() => setTagsOpen(true)}
          aria-label={`標籤（已選 ${selectedTags.length} 個）`}
          className="relative flex size-11 items-center justify-center rounded-full transition-colors hover:bg-fill-2"
        >
          <TagIcon size={23} className="text-ink" />
          {selectedTags.length > 0 && (
            <span className="absolute right-0.5 top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
              {selectedTags.length}
            </span>
          )}
        </button>
        <div className="ml-1 min-w-0">
          <DeckSelect decks={decks} value={form.deckId} onChange={(id) => set('deckId', id)} />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {isEdit ? (
            <Menu
              label="更多操作"
              items={[
                { label: '重設學習進度', icon: <RotateCcw size={18} />, onSelect: () => void reset(), disabled: card?.state === CardState.New },
                { label: '刪除卡片', icon: <Trash2 size={18} />, onSelect: () => void remove(), destructive: true, separated: true },
              ]}
              trigger={(p) => (
                <button {...p} type="button" aria-label="更多操作" className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-fill-2">
                  <Ellipsis size={22} />
                </button>
              )}
            />
          ) : (
            dirty && (
              <button type="button" onClick={() => void clearForm()} className="min-h-11 px-2 text-[16px] text-ink-2 hover:text-ink">
                清除
              </button>
            )
          )}
          <button
            type="submit"
            disabled={saving}
            className="min-h-10 rounded-[12px] bg-tint px-5 text-[17px] font-semibold text-white shadow-[0_6px_16px_-6px_var(--c-tint)] transition-[transform,filter] active:scale-[0.97] disabled:opacity-60"
          >
            {saving ? '儲存中…' : '完成'}
          </button>
        </div>
      </div>

      <h1 className="sr-only">{isEdit ? '編輯卡片' : '新增卡片'}</h1>

      {selectedTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {selectedTags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTagsOpen(true)}
              className="flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold"
              style={{ background: `${getColor(t.color).solid}1f`, color: getColor(t.color).to }}
            >
              # {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <EditorBlock
          title="卡片正面"
          action={speakButton(form.front, '朗讀正面')}
          onPickImage={(b) => set('frontBlob', b)}
          error={frontError}
        >
          <ImagePreview blob={form.frontBlob} storedId={card?.frontImage} onRemove={() => set('frontBlob', null)} alt="正面圖片預覽" />
          <label htmlFor="card-front" className="sr-only">
            卡片正面
          </label>
          <TextArea
            ref={frontRef}
            id="card-front"
            bare
            minRows={2}
            value={form.front}
            onChange={(e) => set('front', e.target.value)}
            placeholder="單字、問題或概念…"
            aria-invalid={Boolean(frontError)}
            autoFocus={!isEdit && window.matchMedia('(pointer: fine)').matches}
            className="min-h-[60px] text-[20px] font-medium"
          />
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
            <span className="shrink-0 rounded-md bg-fill px-2 py-0.5 text-[12px] font-medium text-ink-2">提示</span>
            <input
              id="card-hint"
              value={form.hint}
              onChange={(e) => set('hint', e.target.value)}
              placeholder="可選，複習時可點開的提示問題"
              aria-label="提示（可選）"
              className="min-h-10 w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-2/70"
            />
          </div>
        </EditorBlock>

        <EditorBlock
          title="卡片背面"
          action={speakButton(form.back, '朗讀背面')}
          onPickImage={(b) => set('backBlob', b)} error={backError} className="lg:row-span-2">
          <ImagePreview blob={form.backBlob} storedId={card?.backImage} onRemove={() => set('backBlob', null)} alt="背面圖片預覽" />
          <label htmlFor="card-back" className="sr-only">
            卡片背面
          </label>
          <TextArea
            id="card-back"
            bare
            minRows={7}
            value={form.back}
            onChange={(e) => set('back', e.target.value)}
            placeholder="輸入你希望記憶的內容…"
            aria-invalid={Boolean(backError)}
            className="min-h-[180px]"
          />
        </EditorBlock>

        <EditorBlock
          title="額外資訊"
          optional
          action={
            <>
              {speakButton(exampleSpeechText(form.extra), '朗讀例句')}
              <button
                type="button"
                onClick={() => setExtraOpen((o) => !o)}
                aria-expanded={extraOpen}
                aria-controls="extra-panel"
                aria-label={extraOpen ? '收合額外資訊' : '展開額外資訊'}
                className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-fill-2"
              >
                <ChevronDown size={22} className={clsx('transition-transform duration-300', !extraOpen && 'rotate-180')} />
              </button>
            </>
          }
          collapsed={!extraOpen}
          bodyId="extra-panel"
        >
          <TextArea
            bare
            minRows={3}
            value={form.extra}
            onChange={(e) => set('extra', e.target.value)}
            placeholder="例句、詞源、記憶技巧…（顯示答案時一併出現）"
            aria-label="額外資訊"
          />
        </EditorBlock>
      </div>

      {card && (
        <p className="mt-6 px-1 text-[13px] text-ink-2">
          {stateLabel[card.state]} · 已複習 {card.reps} 次
          {card.state !== CardState.New && ` · 下次複習 ${formatRelativeFuture(card.due)}`}
        </p>
      )}
      <p className="mt-2 hidden px-1 text-[12px] text-ink-2 lg:block">提示：按 ⌘/Ctrl + Enter 快速儲存</p>

      <TagPicker
        open={tagsOpen}
        onClose={() => setTagsOpen(false)}
        tags={tags}
        selected={form.tagIds}
        onChange={(ids) => set('tagIds', ids)}
      />
    </form>
  )
}
