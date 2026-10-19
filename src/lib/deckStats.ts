import { CardState, Rating, type Flashcard, type ReviewLogEntry } from '../types/card'
import type { DeckStats } from '../types/deck'
import type { DailyStudyStat } from '../types/stats'
import { DAY, studyDayBounds, studyDayKey } from './time'

export function computeDeckStats(cards: Flashcard[], now: number, dayStartHour: number): DeckStats {
  const { end } = studyDayBounds(now, dayStartHour)
  const stats: DeckStats = { total: cards.length, newCount: 0, learningCount: 0, reviewCount: 0, dueToday: 0 }
  for (const c of cards) {
    if (c.state === CardState.New) stats.newCount += 1
    else {
      if (c.state === CardState.Review) stats.reviewCount += 1
      else stats.learningCount += 1
      if (c.due < end) stats.dueToday += 1
    }
  }
  return stats
}

export function groupByDeck(cards: Flashcard[]): Map<string, Flashcard[]> {
  const map = new Map<string, Flashcard[]>()
  for (const c of cards) {
    const list = map.get(c.deckId)
    if (list) list.push(c)
    else map.set(c.deckId, [c])
  }
  return map
}

/** One entry per study day, oldest first, ending with today. */
export function dailyStats(logs: ReviewLogEntry[], days: number, now: number, dayStartHour: number): DailyStudyStat[] {
  const byDay = new Map<string, { reviews: number; again: number; newIds: Set<string>; ms: number }>()
  for (const log of logs) {
    const key = studyDayKey(log.reviewedAt, dayStartHour)
    let d = byDay.get(key)
    if (!d) byDay.set(key, (d = { reviews: 0, again: 0, newIds: new Set(), ms: 0 }))
    d.reviews += 1
    if (log.rating === Rating.Again) d.again += 1
    if (log.state === CardState.New) d.newIds.add(log.cardId)
    d.ms += log.durationMs
  }

  const out: DailyStudyStat[] = []
  const { start } = studyDayBounds(now, dayStartHour)
  for (let i = days - 1; i >= 0; i--) {
    // Noon of each day avoids DST edge cases when stepping backwards.
    const key = studyDayKey(start - i * DAY + DAY / 2, dayStartHour)
    const d = byDay.get(key)
    out.push({
      date: key,
      reviews: d?.reviews ?? 0,
      newCards: d?.newIds.size ?? 0,
      timeMinutes: d ? Math.round(d.ms / 60_000) : 0,
      retentionRate: d && d.reviews > 0 ? (d.reviews - d.again) / d.reviews : null,
    })
  }
  return out
}

/** Consecutive study days with at least one review, counting back from today (or yesterday). */
export function computeStreak(daily: DailyStudyStat[]): number {
  let i = daily.length - 1
  if (i >= 0 && daily[i].reviews === 0) i -= 1 // today not started yet doesn't break the streak
  let streak = 0
  for (; i >= 0 && daily[i].reviews > 0; i--) streak += 1
  return streak
}
