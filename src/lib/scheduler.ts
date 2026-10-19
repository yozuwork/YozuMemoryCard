import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card as FsrsCard,
  type FSRS,
  type Grade,
} from 'ts-fsrs'
import { Rating, type CardState, type Schedule } from '../types/card'

const schedulers = new Map<number, FSRS>()

function getScheduler(retention: number): FSRS {
  const key = Math.round(retention * 100) / 100
  let s = schedulers.get(key)
  if (!s) {
    s = fsrs(generatorParameters({ request_retention: key, enable_fuzz: true, enable_short_term: true }))
    schedulers.set(key, s)
  }
  return s
}

export function toFsrs(s: Schedule): FsrsCard {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.lastReview ? new Date(s.lastReview) : undefined,
  }
}

export function fromFsrs(c: FsrsCard): Schedule {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as CardState,
    lastReview: c.last_review ? c.last_review.getTime() : undefined,
  }
}

export function pickSchedule(s: Schedule): Schedule {
  return {
    due: s.due,
    stability: s.stability,
    difficulty: s.difficulty,
    elapsedDays: s.elapsedDays,
    scheduledDays: s.scheduledDays,
    learningSteps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    lastReview: s.lastReview,
  }
}

export function newSchedule(now = Date.now()): Schedule {
  return fromFsrs(createEmptyCard(new Date(now)))
}

export const grades: Rating[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]

/** Due time for each rating, for the interval hints under the rating buttons. */
export function previewDue(s: Schedule, now: number, retention: number): Record<Rating, number> {
  const preview = getScheduler(retention).repeat(toFsrs(s), new Date(now))
  const out = {} as Record<Rating, number>
  for (const g of grades) out[g] = preview[g as Grade].card.due.getTime()
  return out
}

export function applyRating(s: Schedule, rating: Rating, now: number, retention: number): Schedule {
  const { card } = getScheduler(retention).next(toFsrs(s), new Date(now), rating as Grade)
  return fromFsrs(card)
}

/** Probability of recall right now, 0–1. New cards report 0. */
export function retrievability(s: Schedule, now: number, retention: number): number {
  if (s.state === 0 || !s.lastReview) return 0
  return getScheduler(retention).get_retrievability(toFsrs(s), new Date(now), false)
}
