import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { createDeck, createTag, deleteDeck, deleteTag, rateCard, saveCard, undoReview } from './repo'
import { buildBackup, importBackup, parseBackup } from './backup'
import { CardState, Rating } from '../types/card'

const content = (deckId: string, tagIds: string[] = []) => ({
  deckId,
  front: 'hello',
  back: '你好',
  hint: '',
  extra: '',
  tagIds,
  starred: false,
})

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('repository', () => {
  it('creates a new card with a fresh FSRS schedule', async () => {
    const deck = await createDeck({ name: 'English', color: 'rose' })
    const card = await saveCard(null, content(deck.id), {})
    const stored = await db.cards.get(card.id)
    expect(stored?.state).toBe(CardState.New)
    expect(stored?.front).toBe('hello')
  })

  it('stores, replaces and removes card images', async () => {
    const deck = await createDeck({ name: 'Pics', color: 'blue' })
    const card = await saveCard(null, content(deck.id), { front: new Blob(['a'], { type: 'image/png' }) })
    expect(await db.media.count()).toBe(1)
    await saveCard(card.id, content(deck.id), { front: new Blob(['b'], { type: 'image/png' }) })
    expect(await db.media.count()).toBe(1)
    await saveCard(card.id, content(deck.id), { front: null })
    expect(await db.media.count()).toBe(0)
    expect((await db.cards.get(card.id))?.frontImage).toBeUndefined()
  })

  it('rates a card, logs it, and undo restores the previous schedule', async () => {
    const deck = await createDeck({ name: 'D', color: 'rose' })
    const card = await saveCard(null, content(deck.id), {})
    const { log, card: rated } = await rateCard(card, Rating.Good, { now: Date.now(), retention: 0.9, durationMs: 4000 })
    expect(rated.reps).toBe(1)
    expect(await db.reviews.count()).toBe(1)

    const restored = await undoReview(log.id)
    expect(restored?.state).toBe(CardState.New)
    expect(restored?.reps).toBe(0)
    expect(await db.reviews.count()).toBe(0)
  })

  it('deleting a tag keeps the cards and only removes the tag from them', async () => {
    const deck = await createDeck({ name: 'D', color: 'rose' })
    const tag = await createTag({ name: '前端', color: 'lilac' })
    const card = await saveCard(null, content(deck.id, [tag.id]), {})
    await deleteTag(tag.id)
    const stored = await db.cards.get(card.id)
    expect(stored).toBeDefined()
    expect(stored?.tagIds).toEqual([])
  })

  it('deleting a deck removes its cards, images and history', async () => {
    const deck = await createDeck({ name: 'D', color: 'rose' })
    const other = await createDeck({ name: 'Keep', color: 'blue' })
    const card = await saveCard(null, content(deck.id), { back: new Blob(['x'], { type: 'image/png' }) })
    await saveCard(null, content(other.id), {})
    await rateCard(card, Rating.Again, { now: Date.now(), retention: 0.9, durationMs: 1 })
    await deleteDeck(deck.id)
    expect(await db.cards.count()).toBe(1)
    expect(await db.media.count()).toBe(0)
    expect(await db.reviews.count()).toBe(0)
  })

  it('round-trips a full backup including images', async () => {
    const deck = await createDeck({ name: 'Backup', color: 'teal' })
    await saveCard(null, content(deck.id), { front: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }) })
    const backup = JSON.parse(JSON.stringify(await buildBackup()))
    await Promise.all(db.tables.map((t) => t.clear()))

    const result = await importBackup(parseBackup(backup), 'replace')
    expect(result).toMatchObject({ decks: 1, cards: 1 })
    const media = await db.media.toArray()
    expect(media).toHaveLength(1)
    expect(new Uint8Array(await media[0].blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('rejects files that are not backups', () => {
    expect(() => parseBackup({ hello: 1 })).toThrow()
  })
})
