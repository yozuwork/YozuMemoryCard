import { describe, expect, it } from 'vitest'
import { buildStudyPlan, pickNextCard, nextLearningDue, LEARN_AHEAD_MS } from './queue'
import { applyRating, newSchedule, previewDue } from './scheduler'
import { formatInterval, studyDayBounds, studyDayKey, HOUR, DAY, MINUTE } from './time'
import { detectLanguage, scriptCandidates } from './speech'
import { emptyFilter, filterNotes, sortNotes } from './noteFilters'
import { computeStreak, dailyStats } from './deckStats'
import { CardState, Rating, type Flashcard, type ReviewLogEntry } from '../types/card'
import { parseDelimited } from '../db/backup'

const T0 = new Date(2026, 9, 19, 10, 0, 0).getTime() // 10:00 local

function card(id: string, patch: Partial<Flashcard> = {}): Flashcard {
  return {
    id,
    deckId: 'd1',
    front: id,
    back: `${id}-back`,
    hint: '',
    extra: '',
    tagIds: [],
    starred: false,
    ...newSchedule(T0 - DAY),
    createdAt: T0 - DAY,
    updatedAt: T0 - DAY,
    ...patch,
  }
}

function log(cardId: string, state: CardState, at = T0 - HOUR, rating: Rating = Rating.Good): ReviewLogEntry {
  return { id: `l-${cardId}-${at}`, cardId, deckId: 'd1', rating, state, reviewedAt: at, durationMs: 5000, scheduledDays: 1, prev: newSchedule(at) }
}

const limits = { newPerDay: 2, reviewsPerDay: 2, dayStartHour: 4 }

describe('study day', () => {
  it('starts at the configured hour', () => {
    const { start, end } = studyDayBounds(T0, 4)
    expect(new Date(start).getHours()).toBe(4)
    expect(end - start).toBe(DAY)
  })
  it('counts early-morning activity towards the previous day', () => {
    const lateNight = new Date(2026, 9, 20, 2, 0).getTime()
    expect(studyDayKey(lateNight, 4)).toBe('2026-10-19')
    expect(studyDayKey(lateNight, 0)).toBe('2026-10-20')
  })
})

describe('buildStudyPlan', () => {
  it('limits new cards by the remaining daily quota', () => {
    const cards = [card('n1', { createdAt: 1 }), card('n2', { createdAt: 2 }), card('n3', { createdAt: 3 })]
    const plan = buildStudyPlan(cards, [log('x', CardState.New)], limits, T0)
    expect(plan.news.map((c) => c.id)).toEqual(['n1'])
    expect(plan.newDoneToday).toBe(1)
  })

  it('includes review cards due before the day ends, earliest first, within the review quota', () => {
    const cards = [
      card('r-late', { state: CardState.Review, due: T0 + 5 * HOUR }),
      card('r-early', { state: CardState.Review, due: T0 - DAY }),
      card('r-tomorrow', { state: CardState.Review, due: T0 + 2 * DAY }),
      card('r-mid', { state: CardState.Review, due: T0 }),
    ]
    const plan = buildStudyPlan(cards, [], limits, T0)
    expect(plan.reviews.map((c) => c.id)).toEqual(['r-early', 'r-mid'])
  })
})

describe('pickNextCard', () => {
  const learningNow = card('l-now', { state: CardState.Learning, due: T0 - MINUTE })
  const learningSoon = card('l-soon', { state: CardState.Learning, due: T0 + 5 * MINUTE })
  const review = card('rev', { state: CardState.Review, due: T0 - HOUR })
  const fresh = card('new')

  it('shows due learning cards first, then follows the study order', () => {
    const plan = buildStudyPlan([learningSoon, review, fresh, learningNow], [], limits, T0)
    const opts = { order: 'review-first' as const, served: 0, skipped: new Set<string>() }
    expect(pickNextCard(plan, T0, opts)?.id).toBe('l-now')

    const plan2 = buildStudyPlan([learningSoon, review, fresh], [], limits, T0)
    expect(pickNextCard(plan2, T0, opts)?.id).toBe('rev')
    expect(pickNextCard(plan2, T0, { ...opts, order: 'new-first' })?.id).toBe('new')
  })

  it('learns ahead only when nothing else is left', () => {
    const plan = buildStudyPlan([learningSoon], [], limits, T0)
    expect(pickNextCard(plan, T0, { order: 'mixed', served: 0, skipped: new Set() })?.id).toBe('l-soon')
    const far = card('l-far', { state: CardState.Learning, due: T0 + LEARN_AHEAD_MS + HOUR })
    const plan2 = buildStudyPlan([far], [], limits, T0)
    expect(pickNextCard(plan2, T0, { order: 'mixed', served: 0, skipped: new Set() })).toBeNull()
    expect(nextLearningDue(plan2, T0)).toBe(far.due)
  })

  it('puts skipped cards at the back of the line', () => {
    const plan = buildStudyPlan([review, fresh], [], limits, T0)
    expect(pickNextCard(plan, T0, { order: 'review-first', served: 0, skipped: new Set(['rev']) })?.id).toBe('new')
    // Still returned once it is the only card left.
    const only = buildStudyPlan([review], [], limits, T0)
    expect(pickNextCard(only, T0, { order: 'review-first', served: 0, skipped: new Set(['rev']) })?.id).toBe('rev')
  })
})

describe('FSRS scheduling', () => {
  it('orders intervals again < hard < good < easy for a new card', () => {
    const d = previewDue(newSchedule(T0), T0, 0.9)
    expect(d[Rating.Again]).toBeLessThan(d[Rating.Hard])
    expect(d[Rating.Hard]).toBeLessThanOrEqual(d[Rating.Good])
    expect(d[Rating.Good]).toBeLessThan(d[Rating.Easy])
  })

  it('moves a new card out of the new state and counts the repetition', () => {
    const next = applyRating(newSchedule(T0), Rating.Good, T0, 0.9)
    expect(next.state).not.toBe(CardState.New)
    expect(next.reps).toBe(1)
    expect(next.due).toBeGreaterThan(T0)
  })

  it('counts a lapse when a review card is forgotten', () => {
    let s = applyRating(newSchedule(T0), Rating.Easy, T0, 0.9)
    expect(s.state).toBe(CardState.Review)
    s = applyRating(s, Rating.Again, s.due, 0.9)
    expect(s.lapses).toBe(1)
    expect(s.state).toBe(CardState.Relearning)
  })
})

describe('formatInterval', () => {
  it('uses natural units', () => {
    expect(formatInterval(30_000)).toBe('< 1 分鐘')
    expect(formatInterval(10 * MINUTE)).toBe('10 分鐘')
    expect(formatInterval(3 * HOUR)).toBe('3 小時')
    expect(formatInterval(4 * DAY)).toBe('4 天')
    expect(formatInterval(90 * DAY)).toBe('3 個月')
    expect(formatInterval(730 * DAY)).toBe('2 年')
  })
})

describe('language detection', () => {
  const order = ['zh-TW', 'en-US', 'ja-JP']
  it('recognises scripts', () => {
    expect(scriptCandidates('こんにちは')).toEqual(['ja'])
    expect(scriptCandidates('안녕')).toEqual(['ko'])
    expect(scriptCandidates('確認')).toEqual(['zh', 'ja'])
  })
  it('resolves ambiguity with the preferred order', () => {
    expect(detectLanguage('確認', order)).toBe('zh-TW')
    expect(detectLanguage('確認', ['ja-JP', 'zh-TW'])).toBe('ja-JP')
    expect(detectLanguage('確認する', order)).toBe('ja-JP')
    expect(detectLanguage('confirm', order)).toBe('en-US')
    expect(detectLanguage('안녕하세요', order)).toBe('ko-KR')
  })
})

describe('note filters', () => {
  const cards = [
    card('apple', { createdAt: 3, starred: true, tagIds: ['t1'] }),
    card('Banana', { createdAt: 1, back: '香蕉', deckId: 'd2' }),
    card('cherry', { createdAt: 2, state: CardState.Review, due: T0 - HOUR }),
  ]
  it('searches front and back text, case-insensitively', () => {
    expect(filterNotes(cards, 'BAN', emptyFilter, T0).map((c) => c.id)).toEqual(['Banana'])
    expect(filterNotes(cards, '香蕉', emptyFilter, T0).map((c) => c.id)).toEqual(['Banana'])
  })
  it('applies deck, starred, tag and due filters', () => {
    expect(filterNotes(cards, '', { ...emptyFilter, deckId: 'd2' }, T0)).toHaveLength(1)
    expect(filterNotes(cards, '', { ...emptyFilter, starredOnly: true }, T0).map((c) => c.id)).toEqual(['apple'])
    expect(filterNotes(cards, '', { ...emptyFilter, tagIds: ['t1'] }, T0).map((c) => c.id)).toEqual(['apple'])
    expect(filterNotes(cards, '', { ...emptyFilter, dueOnly: true }, T0).map((c) => c.id)).toEqual(['cherry'])
  })
  it('sorts by date and alphabetically', () => {
    expect(sortNotes(cards, 'createdAt', 'desc').map((c) => c.id)).toEqual(['apple', 'cherry', 'Banana'])
    expect(sortNotes(cards, 'front', 'asc').map((c) => c.id)).toEqual(['apple', 'Banana', 'cherry'])
  })
})

describe('daily stats & streak', () => {
  it('groups logs by study day and counts the streak', () => {
    const logs = [log('a', CardState.New, T0), log('b', CardState.Review, T0 - DAY), log('c', CardState.Review, T0 - 2 * DAY, Rating.Again)]
    const daily = dailyStats(logs, 5, T0, 4)
    expect(daily).toHaveLength(5)
    expect(daily[4]).toMatchObject({ reviews: 1, newCards: 1 })
    expect(daily[2].retentionRate).toBe(0)
    expect(computeStreak(daily)).toBe(3)
  })
})

describe('CSV / TSV parsing', () => {
  it('handles quotes, embedded commas and newlines', () => {
    expect(parseDelimited('front,back\n"a, b","line1\nline2"\nc,d')).toEqual([
      ['front', 'back'],
      ['a, b', 'line1\nline2'],
      ['c', 'd'],
    ])
  })
  it('detects tab separated input', () => {
    expect(parseDelimited('單字\t意思\r\nhello\t你好')).toEqual([
      ['單字', '意思'],
      ['hello', '你好'],
    ])
  })
})
