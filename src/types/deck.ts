import type { ColorName } from '../lib/deckColors'

export interface Deck {
  id: string
  name: string
  description: string
  color: ColorName
  createdAt: number
  updatedAt: number
}

export interface Tag {
  id: string
  name: string
  color: ColorName
  createdAt: number
}

export interface DeckStats {
  total: number
  newCount: number
  learningCount: number
  reviewCount: number
  /** Cards (any state except new) due before the end of the study day. */
  dueToday: number
}
