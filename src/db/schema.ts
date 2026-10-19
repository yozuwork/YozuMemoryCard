import Dexie, { type EntityTable } from 'dexie'
import type { Flashcard, MediaItem, ReviewLogEntry } from '../types/card'
import type { Deck, Tag } from '../types/deck'
import type { BackupSnapshot } from '../types/stats'

export class YozuDatabase extends Dexie {
  decks!: EntityTable<Deck, 'id'>
  cards!: EntityTable<Flashcard, 'id'>
  tags!: EntityTable<Tag, 'id'>
  reviews!: EntityTable<ReviewLogEntry, 'id'>
  media!: EntityTable<MediaItem, 'id'>
  backups!: EntityTable<BackupSnapshot, 'id'>

  constructor(name = 'yozuanki') {
    super(name)
    this.version(1).stores({
      decks: 'id, name, createdAt',
      cards: 'id, deckId, state, due, createdAt, updatedAt, *tagIds',
      tags: 'id, name, createdAt',
      reviews: 'id, cardId, deckId, reviewedAt',
      media: 'id',
      backups: 'id, createdAt',
    })
  }
}

export const db = new YozuDatabase()
