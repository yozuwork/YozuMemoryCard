import { CardState, type Flashcard, type ReviewLogEntry } from '../types/card'
import type { StudyOrder } from '../types/settings'
import { MINUTE, studyDayBounds } from './time'

/** Learning cards due within this window are shown early once nothing else is left. */
export const LEARN_AHEAD_MS = 20 * MINUTE

export interface StudyLimits {
  newPerDay: number
  reviewsPerDay: number
  dayStartHour: number
}

export interface StudyPlan {
  /** Learning / relearning cards due before the study day ends, earliest first. */
  learning: Flashcard[]
  /** Review cards due today, limited by the remaining daily review quota. */
  reviews: Flashcard[]
  /** New cards allowed today, oldest first. */
  news: Flashcard[]
  newDoneToday: number
  reviewsDoneToday: number
}

export function buildStudyPlan(
  cards: Flashcard[],
  todayLogs: ReviewLogEntry[],
  limits: StudyLimits,
  now: number,
): StudyPlan {
  const { end } = studyDayBounds(now, limits.dayStartHour)

  const newIds = new Set<string>()
  let reviewsDoneToday = 0
  for (const log of todayLogs) {
    if (log.state === CardState.New) newIds.add(log.cardId)
    else if (log.state === CardState.Review) reviewsDoneToday += 1
  }
  const newDoneToday = newIds.size

  const learning: Flashcard[] = []
  const reviews: Flashcard[] = []
  const news: Flashcard[] = []
  for (const c of cards) {
    if (c.state === CardState.New) news.push(c)
    else if (c.due < end) (c.state === CardState.Review ? reviews : learning).push(c)
  }

  learning.sort((a, b) => a.due - b.due)
  reviews.sort((a, b) => a.due - b.due)
  news.sort((a, b) => a.createdAt - b.createdAt)

  return {
    learning,
    reviews: reviews.slice(0, Math.max(0, limits.reviewsPerDay - reviewsDoneToday)),
    news: news.slice(0, Math.max(0, limits.newPerDay - newDoneToday)),
    newDoneToday,
    reviewsDoneToday,
  }
}

export function planCounts(plan: StudyPlan) {
  return { new: plan.news.length, learning: plan.learning.length, review: plan.reviews.length }
}

export interface PickOptions {
  order: StudyOrder
  /** Cards answered so far this session; drives interleaving in "mixed" mode. */
  served: number
  /** Cards the user skipped; they go to the back of the line. */
  skipped: ReadonlySet<string>
}

function orderedMain(plan: StudyPlan, opts: PickOptions): Flashcard[] {
  const { news, reviews } = plan
  if (opts.order === 'new-first') return [...news, ...reviews]
  if (opts.order === 'review-first' || news.length === 0 || reviews.length === 0) {
    return [...reviews, ...news]
  }
  // Mixed: spread new cards evenly between reviews.
  const every = Math.max(1, Math.floor(reviews.length / news.length))
  const takeNew = opts.served % (every + 1) === every
  return takeNew ? [...news, ...reviews] : [...reviews, ...news]
}

export function pickNextCard(plan: StudyPlan, now: number, opts: PickOptions): Flashcard | null {
  const learningNow = plan.learning.filter((c) => c.due <= now)
  const learningSoon = plan.learning.filter((c) => c.due > now && c.due <= now + LEARN_AHEAD_MS)
  const sequence = [...learningNow, ...orderedMain(plan, opts), ...learningSoon]
  return sequence.find((c) => !opts.skipped.has(c.id)) ?? sequence[0] ?? null
}

/** Earliest learning card that is not yet available, if any. */
export function nextLearningDue(plan: StudyPlan, now: number): number | null {
  const later = plan.learning.filter((c) => c.due > now + LEARN_AHEAD_MS)
  return later.length ? later[0].due : null
}
