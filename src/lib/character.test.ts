import { describe, expect, it } from 'vitest'
import { CARD_CREATED_XP, QUEST_XP, computeCharacter, levelFromXp, questsForDay, reviewXp, titleForLevel, xpToNext } from './character'
import { newSchedule } from './scheduler'
import { CardState, Rating, type Flashcard, type ReviewLogEntry } from '../types/card'

const NOW = new Date(2026, 9, 21, 12, 0, 0).getTime()

function card(id: string, front: string, createdAt = NOW): Flashcard {
  return { id, deckId: 'd', front, back: '', hint: '', extra: '', tagIds: [], starred: false, ...newSchedule(createdAt), createdAt, updatedAt: createdAt }
}

function log(cardId: string, rating: Rating, state: CardState = CardState.Review, at = NOW, durationMs = 5000): ReviewLogEntry {
  return { id: `${cardId}-${at}-${Math.random()}`, cardId, deckId: 'd', rating, state, reviewedAt: at, durationMs, scheduledDays: 0, prev: newSchedule(at) }
}

describe('levels', () => {
  it('needs more EXP for each level', () => {
    expect(xpToNext(1)).toBe(100)
    expect(xpToNext(2)).toBe(140)
    expect(levelFromXp(0)).toMatchObject({ level: 1, into: 0, need: 100 })
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100)).toMatchObject({ level: 2, into: 0, need: 140 })
    expect(levelFromXp(250)).toMatchObject({ level: 3, into: 10, need: 180 })
  })

  it('gives titles by level band', () => {
    expect(titleForLevel(1)).toBe('見習冒險者')
    expect(titleForLevel(6)).toBe('單字獵人')
    expect(titleForLevel(99)).toBe('萬語之王')
  })

  it('rewards better ratings and first-time learning', () => {
    expect(reviewXp({ rating: Rating.Again, state: CardState.Review })).toBeLessThan(reviewXp({ rating: Rating.Easy, state: CardState.Review }))
    expect(reviewXp({ rating: Rating.Good, state: CardState.New })).toBeGreaterThan(reviewXp({ rating: Rating.Good, state: CardState.Review }))
  })
})

describe('quests', () => {
  it('tracks language quests separately', () => {
    const langOf = (id: string) => (id.startsWith('ja') ? 'ja' : 'en') as 'ja' | 'en'
    const logs = Array.from({ length: 20 }, (_, i) => log(`ja${i}`, Rating.Good, CardState.New))
    const quests = questsForDay({ logs, created: 0 }, langOf)
    const byId = new Map(quests.map((q) => [q.id, q]))
    expect(byId.get('ja-review')?.done).toBe(true)
    expect(byId.get('ja-learn')).toMatchObject({ progress: 10, done: true })
    expect(byId.get('ja-accuracy')).toMatchObject({ progress: 15, done: true })
    expect(byId.has('en-review')).toBe(false)
    expect(byId.get('checkin')?.done).toBe(true)
  })
})

describe('computeCharacter', () => {
  it('sums review, card and quest EXP and splits it by language', () => {
    const cards = [card('a', '電車'), card('b', 'confirm')]
    const logs = [log('a', Rating.Good), log('b', Rating.Easy)]
    const result = computeCharacter(cards, logs, NOW, 4)
    const reviewTotal = reviewXp(logs[0]) + reviewXp(logs[1])
    const questTotal = result.todayQuests.filter((q) => q.done).length * QUEST_XP
    expect(result.level.total).toBe(reviewTotal + 2 * CARD_CREATED_XP + questTotal)
    expect(result.languages.ja.xp).toBe(reviewXp(logs[0]))
    expect(result.languages.en.xp).toBe(reviewXp(logs[1]))
    expect(result.todayAccuracy).toBe(1)
  })
})
