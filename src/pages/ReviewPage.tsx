import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChartColumn, PencilLine, Plus, SkipForward, Undo2 } from 'lucide-react'
import clsx from 'clsx'
import { useCards, useDecks, useLogsSince } from '../hooks/useData'
import { useNow } from '../hooks/useEnvironment'
import { useSpeech } from '../hooks/useSpeech'
import { useSettings } from '../store/settings'
import { toast } from '../store/ui'
import { rateCard, undoReview } from '../db/repo'
import { buildStudyPlan, nextLearningDue, pickNextCard, planCounts } from '../lib/queue'
import { previewDue } from '../lib/scheduler'
import { computeStreak, dailyStats } from '../lib/deckStats'
import { studyDayBounds, DAY } from '../lib/time'
import { CardState, type Flashcard, type Rating } from '../types/card'
import { FlashcardView } from '../components/review/FlashcardView'
import { RatingButtons } from '../components/review/RatingButtons'
import { DeckPicker } from '../components/review/DeckPicker'
import { SessionSummary } from '../components/review/SessionSummary'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Controls'
import { buttonClasses } from '../components/ui/buttonStyles'

const LAST_DECK_KEY = 'yozuanki-review-deck'

function readLastDeck(): string {
  try {
    return localStorage.getItem(LAST_DECK_KEY) ?? 'all'
  } catch {
    return 'all'
  }
}

export function ReviewPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const deckFilter = params.get('deck') ?? readLastDeck()

  const settings = useSettings()
  const now = useNow(15_000)
  const { start: dayStart } = studyDayBounds(now, settings.dayStartHour)

  const decks = useDecks()
  const cards = useCards()
  const todayLogsAll = useLogsSince(dayStart)
  const recentLogs = useLogsSince(dayStart - 60 * DAY)
  const { say, supported: speechSupported } = useSpeech()

  // Session state
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [served, setServed] = useState(0)
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set())
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [extraNew, setExtraNew] = useState(0)
  const [busy, setBusy] = useState(false)
  // Freshly written cards, applied over the live query until it catches up.
  const [overrides, setOverrides] = useState<Map<string, Flashcard>>(() => new Map())
  const shownAt = useRef(Date.now())

  const deckExists = deckFilter === 'all' || decks?.some((d) => d.id === deckFilter)
  const scope = deckExists ? deckFilter : 'all'

  const merged = useMemo(() => {
    if (!cards) return undefined
    if (overrides.size === 0) return cards
    return cards.map((c) => {
      const o = overrides.get(c.id)
      return o && o.updatedAt >= c.updatedAt ? o : c
    })
  }, [cards, overrides])

  const scoped = useMemo(
    () => (merged ? (scope === 'all' ? merged : merged.filter((c) => c.deckId === scope)) : undefined),
    [merged, scope],
  )
  const scopedLogs = useMemo(
    () => (todayLogsAll ? (scope === 'all' ? todayLogsAll : todayLogsAll.filter((l) => l.deckId === scope)) : undefined),
    [todayLogsAll, scope],
  )

  const plan = useMemo(() => {
    if (!scoped || !scopedLogs) return undefined
    return buildStudyPlan(
      scoped,
      scopedLogs,
      { newPerDay: settings.newPerDay + extraNew, reviewsPerDay: settings.reviewsPerDay, dayStartHour: settings.dayStartHour },
      now,
    )
  }, [scoped, scopedLogs, settings.newPerDay, settings.reviewsPerDay, settings.dayStartHour, extraNew, now])

  const current = currentId ? merged?.find((c) => c.id === currentId) : undefined

  // Pick the next card whenever nothing (valid) is on screen.
  useEffect(() => {
    if (!plan) return
    if (currentId && current) return
    const next = pickNextCard(plan, Date.now(), { order: settings.studyOrder, served, skipped })
    if (next && next.id !== currentId) {
      setCurrentId(next.id)
      setRevealed(false)
      shownAt.current = Date.now()
    } else if (!next && currentId) {
      setCurrentId(null)
    }
  }, [plan, currentId, current, settings.studyOrder, served, skipped])

  // Auto read-aloud.
  useEffect(() => {
    if (current && !revealed && settings.autoSpeakFront) void say(current.front)
    // Only when a new card appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])
  useEffect(() => {
    if (current && revealed && settings.autoSpeakBack) void say(current.back)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed])

  const dues = useMemo(
    () => (current ? previewDue(current, now, settings.retention) : undefined),
    // Recompute when revealing so intervals reflect the moment of answering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, revealed, settings.retention],
  )

  const reveal = useCallback(() => setRevealed(true), [])

  const rate = useCallback(
    async (rating: Rating) => {
      if (!current || !revealed || busy) return
      setBusy(true)
      try {
        const { log, card } = await rateCard(current, rating, {
          now: Date.now(),
          retention: settings.retention,
          durationMs: Date.now() - shownAt.current,
        })
        setOverrides((m) => new Map(m).set(card.id, card))
        setUndoStack((s) => [...s.slice(-49), log.id])
        setSkipped((s) => {
          if (!s.has(card.id)) return s
          const n = new Set(s)
          n.delete(card.id)
          return n
        })
        setServed((n) => n + 1)
        setCurrentId(null)
      } catch (e) {
        console.error(e)
        toast('儲存評分失敗，請再試一次', { tone: 'error' })
      } finally {
        setBusy(false)
      }
    },
    [current, revealed, busy, settings.retention],
  )

  const undo = useCallback(async () => {
    const logId = undoStack[undoStack.length - 1]
    if (!logId || busy) return
    setBusy(true)
    try {
      const restored = await undoReview(logId)
      setUndoStack((s) => s.slice(0, -1))
      if (restored) {
        setOverrides((m) => new Map(m).set(restored.id, restored))
        setCurrentId(restored.id)
        setRevealed(false)
        setServed((n) => Math.max(0, n - 1))
        shownAt.current = Date.now()
        toast('已復原上一次評分')
      }
    } finally {
      setBusy(false)
    }
  }, [undoStack, busy])

  const skip = useCallback(() => {
    if (!current) return
    setSkipped((s) => new Set(s).add(current.id))
    setCurrentId(null)
  }, [current])

  // Keyboard shortcuts: Space/Enter reveal (then = 普通), 1–4 rate, Z undo, → skip, R read aloud, E edit.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey) return
      const t = e.target as HTMLElement
      if (t.closest('input,textarea,select,[contenteditable="true"],[role="dialog"],[role="alertdialog"]')) return
      if (e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault()
          void undo()
        }
        return
      }
      if (!current) return
      if (e.key === ' ' || e.key === 'Enter') {
        if (t.closest('button,a')) return
        e.preventDefault()
        if (!revealed) reveal()
        else void rate(3 as Rating)
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        void rate(Number(e.key) as Rating)
      } else if (e.key.toLowerCase() === 'z') void undo()
      else if (e.key === 'ArrowRight') skip()
      else if (e.key.toLowerCase() === 'r') void say(revealed ? current.back : current.front)
      else if (e.key.toLowerCase() === 'e') navigate(`/notes/card/${current.id}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, revealed, reveal, rate, undo, skip, say, navigate])

  function changeDeck(id: string) {
    try {
      localStorage.setItem(LAST_DECK_KEY, id)
    } catch {
      /* ignore */
    }
    setParams(id === 'all' ? {} : { deck: id }, { replace: true })
    setCurrentId(null)
    setRevealed(false)
    setSkipped(new Set())
    setExtraNew(0)
  }

  const loading = !decks || !plan || !scoped || !recentLogs
  const counts = plan ? planCounts(plan) : { new: 0, learning: 0, review: 0 }

  // When nothing is left: figure out when the next batch arrives.
  const nextInfo = useMemo(() => {
    if (!plan || !scoped) return { at: null as number | null, count: 0 }
    const learningAt = nextLearningDue(plan, now)
    if (learningAt) return { at: learningAt, count: plan.learning.filter((c) => c.due > now).length }
    const later = scoped.filter((c) => c.state !== CardState.New && c.due > now).sort((a, b) => a.due - b.due)
    if (later.length === 0) return { at: null, count: 0 }
    const { end } = studyDayBounds(later[0].due, settings.dayStartHour)
    return { at: later[0].due, count: later.filter((c) => c.due < end).length }
  }, [plan, scoped, now, settings.dayStartHour])

  const streak = useMemo(
    () => (recentLogs ? computeStreak(dailyStats(recentLogs, 60, now, settings.dayStartHour)) : 0),
    [recentLogs, now, settings.dayStartHour],
  )

  const remainingNew = scoped ? scoped.filter((c) => c.state === CardState.New).length - counts.new : 0

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--tabbar-h)-var(--safe-bottom)-var(--safe-top)-60px)] max-w-[680px] flex-col lg:min-h-[calc(100dvh-120px)]">
      {/* Top bar: deck selector · today's counts */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-1">
          {decks && merged ? (
            <DeckPicker
              decks={decks}
              cards={merged}
              value={scope}
              onChange={changeDeck}
              now={now}
              dayStartHour={settings.dayStartHour}
            />
          ) : (
            <Skeleton className="h-8 w-32" />
          )}
          <Link
            to="/stats"
            aria-label="學習統計"
            className="flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-fill-2 hover:text-ink lg:hidden"
          >
            <ChartColumn size={20} />
          </Link>
        </div>
        <dl className="grid shrink-0 grid-cols-[auto_auto] gap-x-2 text-right text-[13px] leading-[1.45]" aria-label="今日進度">
          <dd className={clsx('font-semibold tabular-nums', counts.new ? 'text-tint' : 'text-ink-3')}>{counts.new}</dd>
          <dt className="text-ink-2">新卡片</dt>
          <dd className={clsx('font-semibold tabular-nums', counts.learning ? 'text-[#E5352B] dark:text-[#FF6961]' : 'text-ink-3')}>
            {counts.learning}
          </dd>
          <dt className="text-ink-2">學習中</dt>
          <dd className={clsx('font-semibold tabular-nums', counts.review ? 'text-[#1F8A3C] dark:text-success' : 'text-ink-3')}>
            {counts.review}
          </dd>
          <dt className="text-ink-2">待複習</dt>
        </dl>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <Skeleton className="h-[280px] w-full max-w-[360px] rounded-[20px]" />
        </div>
      ) : scoped!.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<Plus size={28} />}
            title={scope === 'all' ? '還沒有任何卡片' : '這個牌組還沒有卡片'}
            description="到「記錄」新增第一張卡片，就能開始用間隔重複記憶。"
            action={
              <Link to="/record" className={buttonClasses({ variant: 'brand', size: 'md' })}>
                新增卡片
              </Link>
            }
          />
        </div>
      ) : !current ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <SessionSummary
            todayLogs={scopedLogs ?? []}
            streak={streak}
            nextDue={nextInfo.at}
            nextDueCount={nextInfo.count}
            now={now}
            canLearnMore={remainingNew > 0}
            onLearnMore={() => setExtraNew((n) => n + 10)}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
            <FlashcardView
              card={current}
              revealed={revealed}
              onReveal={reveal}
              onSpeak={(t) => void say(t)}
              speechSupported={speechSupported}
            />
            <div className="flex items-center gap-1 text-ink-2" role="toolbar" aria-label="卡片操作">
              <button
                type="button"
                onClick={() => void undo()}
                disabled={undoStack.length === 0 || busy}
                aria-label="復原上一次評分"
                title="復原（Z）"
                className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-fill-2 hover:text-ink disabled:opacity-30"
              >
                <Undo2 size={19} />
              </button>
              <Link
                to={`/notes/card/${current.id}`}
                aria-label="編輯這張卡片"
                title="編輯（E）"
                className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-fill-2 hover:text-ink"
              >
                <PencilLine size={19} />
              </Link>
              <button
                type="button"
                onClick={skip}
                aria-label="跳過，稍後再看"
                title="跳過（→）"
                className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-fill-2 hover:text-ink"
              >
                <SkipForward size={19} />
              </button>
            </div>
          </div>

          <div className="pb-2">
            {revealed && dues ? (
              <RatingButtons onRate={(r) => void rate(r)} dues={dues} now={Date.now()} disabled={busy} showShortcuts />
            ) : (
              <button
                type="button"
                onClick={reveal}
                className="mx-auto flex min-h-[60px] w-full max-w-[360px] flex-col items-center justify-center rounded-2xl transition-colors hover:bg-fill-2"
              >
                <span className="text-brand text-[21px] font-bold tracking-wide">顯示答案</span>
                <kbd className="hidden font-sans text-[11px] text-ink-2 lg:block">空白鍵</kbd>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
