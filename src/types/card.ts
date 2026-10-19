/** Mirrors ts-fsrs `State`, stored as a number so it can be indexed in IndexedDB. */
export const CardState = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const
export type CardState = (typeof CardState)[keyof typeof CardState]

/** Mirrors ts-fsrs `Rating` (Manual excluded). */
export const Rating = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
} as const
export type Rating = (typeof Rating)[keyof typeof Rating]

/** FSRS scheduling fields. Dates are epoch milliseconds. */
export interface Schedule {
  due: number
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  learningSteps: number
  reps: number
  lapses: number
  state: CardState
  lastReview?: number
}

export interface Flashcard extends Schedule {
  id: string
  deckId: string
  front: string
  back: string
  /** Optional cue shown on demand while the answer is hidden. */
  hint: string
  /** Optional notes shown together with the answer. */
  extra: string
  /** Media table ids. */
  frontImage?: string
  backImage?: string
  tagIds: string[]
  starred: boolean
  createdAt: number
  updatedAt: number
}

export type CardContent = Pick<
  Flashcard,
  'deckId' | 'front' | 'back' | 'hint' | 'extra' | 'frontImage' | 'backImage' | 'tagIds' | 'starred'
>

export interface ReviewLogEntry {
  id: string
  cardId: string
  deckId: string
  rating: Rating
  /** State of the card before this review. */
  state: CardState
  reviewedAt: number
  /** Time spent on the card before rating, capped. */
  durationMs: number
  scheduledDays: number
  /** Snapshot taken before the review, used for undo. */
  prev: Schedule
}

export interface MediaItem {
  id: string
  blob: Blob
  type: string
  createdAt: number
}
