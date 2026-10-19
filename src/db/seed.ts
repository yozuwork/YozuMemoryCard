import { db } from './schema'
import { uid } from '../lib/id'
import { newSchedule } from '../lib/scheduler'
import { seedDecks, seedTags } from '../data/mockData'
import type { Flashcard } from '../types/card'
import type { Deck, Tag } from '../types/deck'

const SEEDED_KEY = 'yozuanki-seeded'

let seeding: Promise<void> | undefined

/**
 * Writes the sample decks once per browser. Never touches existing data.
 * Memoised so concurrent callers (e.g. StrictMode's double effect) share one run.
 */
export function seedIfFirstLaunch(): Promise<void> {
  seeding ??= runSeed()
  return seeding
}

async function runSeed(): Promise<void> {
  try {
    if (localStorage.getItem(SEEDED_KEY)) return
  } catch {
    return
  }
  const deckCount = await db.decks.count()
  if (deckCount === 0) await writeSampleData()
  try {
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    // Private mode: we'll simply check the deck count again next launch.
  }
}

export async function writeSampleData() {
  const base = Date.now()
  const tags: Tag[] = seedTags.map((t, i) => ({ id: uid('tag'), ...t, createdAt: base + i }))
  const tagId = new Map(tags.map((t) => [t.name, t.id]))

  const decks: Deck[] = []
  const cards: Flashcard[] = []
  let tick = 0
  for (const seed of seedDecks) {
    const deck: Deck = {
      id: uid('deck'),
      name: seed.name,
      description: seed.description,
      color: seed.color,
      createdAt: base + tick,
      updatedAt: base + tick,
    }
    decks.push(deck)
    for (const c of seed.cards) {
      tick += 1
      const ts = base + tick
      cards.push({
        id: uid('card'),
        deckId: deck.id,
        front: c.front,
        back: c.back,
        hint: c.hint ?? '',
        extra: c.extra ?? '',
        tagIds: (c.tags ?? []).map((n) => tagId.get(n)).filter((id): id is string => Boolean(id)),
        starred: false,
        ...newSchedule(ts),
        createdAt: ts,
        updatedAt: ts,
      })
    }
  }

  await db.transaction('rw', [db.decks, db.cards, db.tags], async () => {
    await db.tags.bulkAdd(tags)
    await db.decks.bulkAdd(decks)
    await db.cards.bulkAdd(cards)
  })
}
