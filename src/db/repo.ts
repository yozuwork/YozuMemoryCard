import { db } from './schema'
import { uid } from '../lib/id'
import { applyRating, newSchedule, pickSchedule } from '../lib/scheduler'
import type { CardContent, Flashcard, Rating, ReviewLogEntry } from '../types/card'
import type { Deck, Tag } from '../types/deck'
import type { ColorName } from '../lib/deckColors'

/* ------------------------------------------------------------------ decks */

export async function createDeck(input: { name: string; description?: string; color: ColorName }): Promise<Deck> {
  const now = Date.now()
  const deck: Deck = {
    id: uid('deck'),
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    color: input.color,
    createdAt: now,
    updatedAt: now,
  }
  await db.decks.add(deck)
  return deck
}

export async function updateDeck(id: string, patch: Partial<Pick<Deck, 'name' | 'description' | 'color'>>) {
  await db.decks.update(id, { ...patch, updatedAt: Date.now() })
}

/** `Blob` uploads a custom cover, `null` restores the default one. */
export async function setDeckCover(id: string, blob: Blob | null) {
  await db.transaction('rw', [db.decks, db.media], async () => {
    const deck = await db.decks.get(id)
    if (!deck) return
    if (deck.coverImage) await db.media.delete(deck.coverImage)
    const coverImage = blob ? await storeMedia(blob) : undefined
    await db.decks.update(id, { coverImage, updatedAt: Date.now() })
  })
}

/** Deletes the deck together with its cards, their images and review history. */
export async function deleteDeck(id: string) {
  await db.transaction('rw', [db.decks, db.cards, db.media, db.reviews], async () => {
    const ids = await db.cards.where('deckId').equals(id).primaryKeys()
    await removeCards(ids)
    const cover = (await db.decks.get(id))?.coverImage
    if (cover) await db.media.delete(cover)
    await db.decks.delete(id)
  })
}

/** Returns an existing deck id, creating a default deck when there is none. */
export async function ensureDeck(preferred?: string): Promise<string> {
  if (preferred && (await db.decks.get(preferred))) return preferred
  const first = await db.decks.orderBy('createdAt').first()
  if (first) return first.id
  return (await createDeck({ name: '我的筆記', color: 'rose' })).id
}

/* ------------------------------------------------------------------ cards */

/** `Blob` stores a new image, `null` removes it, `undefined` leaves it unchanged. */
export interface ImageChanges {
  front?: Blob | null
  back?: Blob | null
}

async function storeMedia(blob: Blob): Promise<string> {
  const id = uid('media')
  await db.media.add({ id, blob, type: blob.type, createdAt: Date.now() })
  return id
}

export async function saveCard(
  existingId: string | null,
  content: Omit<CardContent, 'frontImage' | 'backImage'>,
  images: ImageChanges,
): Promise<Flashcard> {
  return db.transaction('rw', [db.cards, db.media], async () => {
    const now = Date.now()
    const existing = existingId ? await db.cards.get(existingId) : undefined
    let frontImage = existing?.frontImage
    let backImage = existing?.backImage

    if (images.front !== undefined) {
      if (frontImage) await db.media.delete(frontImage)
      frontImage = images.front ? await storeMedia(images.front) : undefined
    }
    if (images.back !== undefined) {
      if (backImage) await db.media.delete(backImage)
      backImage = images.back ? await storeMedia(images.back) : undefined
    }

    const card: Flashcard = existing
      ? { ...existing, ...content, frontImage, backImage, updatedAt: now }
      : { id: uid('card'), ...newSchedule(now), ...content, frontImage, backImage, createdAt: now, updatedAt: now }
    await db.cards.put(card)
    return card
  })
}

async function removeCards(ids: string[]) {
  const cards = (await db.cards.bulkGet(ids)).filter((c): c is Flashcard => Boolean(c))
  const mediaIds = cards.flatMap((c) => [c.frontImage, c.backImage]).filter((m): m is string => Boolean(m))
  await db.media.bulkDelete(mediaIds)
  await db.reviews.where('cardId').anyOf(ids).delete()
  await db.cards.bulkDelete(ids)
}

export async function deleteCards(ids: string[]) {
  await db.transaction('rw', [db.cards, db.media, db.reviews], () => removeCards(ids))
}

export async function moveCards(ids: string[], deckId: string) {
  const now = Date.now()
  await db.cards.where('id').anyOf(ids).modify({ deckId, updatedAt: now })
}

export async function setStarred(id: string, starred: boolean) {
  await db.cards.update(id, { starred, updatedAt: Date.now() })
}

/** Forgets the learning progress of the given cards; history is kept. */
export async function resetCards(ids: string[]) {
  const now = Date.now()
  await db.cards.where('id').anyOf(ids).modify((c) => {
    Object.assign(c, newSchedule(now), { updatedAt: now })
  })
}

/* ---------------------------------------------------------------- reviews */

export async function rateCard(
  card: Flashcard,
  rating: Rating,
  opts: { now: number; retention: number; durationMs: number },
): Promise<{ log: ReviewLogEntry; card: Flashcard }> {
  const prev = pickSchedule(card)
  const next = applyRating(prev, rating, opts.now, opts.retention)
  const updated: Flashcard = { ...card, ...next, updatedAt: opts.now }
  const log: ReviewLogEntry = {
    id: uid('rev'),
    cardId: card.id,
    deckId: card.deckId,
    rating,
    state: prev.state,
    reviewedAt: opts.now,
    durationMs: Math.min(opts.durationMs, 60_000),
    scheduledDays: next.scheduledDays,
    prev,
  }
  await db.transaction('rw', [db.cards, db.reviews], async () => {
    await db.cards.put(updated)
    await db.reviews.add(log)
  })
  return { log, card: updated }
}

/** Restores the card to its state before `logId` and removes that log. */
export async function undoReview(logId: string): Promise<Flashcard | undefined> {
  return db.transaction('rw', [db.cards, db.reviews], async () => {
    const log = await db.reviews.get(logId)
    if (!log) return undefined
    const card = await db.cards.get(log.cardId)
    await db.reviews.delete(logId)
    if (!card) return undefined
    const restored: Flashcard = { ...card, ...log.prev, updatedAt: Date.now() }
    await db.cards.put(restored)
    return restored
  })
}

/* ------------------------------------------------------------------- tags */

export async function createTag(input: { name: string; color: ColorName }): Promise<Tag> {
  const tag: Tag = { id: uid('tag'), name: input.name.trim(), color: input.color, createdAt: Date.now() }
  await db.tags.add(tag)
  return tag
}

export async function updateTag(id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>) {
  await db.tags.update(id, patch)
}

/** Removes the tag from every card; the cards themselves are kept. */
export async function deleteTag(id: string) {
  await db.transaction('rw', [db.tags, db.cards], async () => {
    await db.cards
      .where('tagIds')
      .equals(id)
      .modify((c) => {
        c.tagIds = c.tagIds.filter((t) => t !== id)
      })
    await db.tags.delete(id)
  })
}

export async function findTagByName(name: string): Promise<Tag | undefined> {
  const target = name.trim().toLowerCase()
  return (await db.tags.toArray()).find((t) => t.name.toLowerCase() === target)
}

/* ---------------------------------------------------------------- wipe-out */

/** Turns every card back into a new card and deletes all review history. Content is kept. */
export async function resetAllProgress() {
  const now = Date.now()
  await db.transaction('rw', [db.cards, db.reviews], async () => {
    await db.cards.toCollection().modify((c) => {
      Object.assign(c, newSchedule(now), { updatedAt: now })
    })
    await db.reviews.clear()
  })
}

export async function clearAllData() {
  await db.transaction('rw', [db.decks, db.cards, db.tags, db.reviews, db.media], async () => {
    await Promise.all([db.decks.clear(), db.cards.clear(), db.tags.clear(), db.reviews.clear(), db.media.clear()])
  })
}
