import { db } from './schema'
import { uid } from '../lib/id'
import { newSchedule } from '../lib/scheduler'
import { seedDecks, seedTags, type SeedCard, type SeedDeck } from '../data/mockData'
import { japanTravelDecks, japanTravelTags, type PackDeck } from '../data/japanTravelDecks'
import type { ColorName } from '../lib/deckColors'
import type { Flashcard } from '../types/card'
import type { Deck, Tag } from '../types/deck'

/** Writes the sample decks, cards and tags (Settings → 加入範例牌組). */
export function writeSampleData() {
  return writeDecks(seedDecks, seedTags)
}

let installing: Promise<void> | undefined

/**
 * Installs each built-in Japanese travel deck once per browser, and brings
 * installed copies up to the pack's current version: missing cards are added
 * and empty examples filled in, while the user's edits and progress are kept.
 * A deck the user deletes stays deleted; one that already exists by name is
 * adopted rather than duplicated. Memoised so concurrent callers (e.g.
 * StrictMode's double effect) share one run.
 */
export function installJapanTravelDecks(): Promise<void> {
  installing ??= syncJapanTravelDecks()
  return installing
}

/** localStorage value: the pack version last installed ('1' from before versioning). */
const packFlag = (key: string) => `yozuanki-pack-${key}`

/** Unmemoised install / sync run; exported for tests. */
export async function syncJapanTravelDecks() {
  let installed: Map<string, number>
  try {
    installed = new Map(japanTravelDecks.map((d) => [d.key, Number(localStorage.getItem(packFlag(d.key))) || 0]))
  } catch {
    return
  }
  const outdated = japanTravelDecks.filter((d) => (installed.get(d.key) ?? 0) < d.version)
  if (outdated.length === 0) return

  const decks = await db.decks.toArray()
  const fresh: PackDeck[] = []
  for (const pack of outdated) {
    const existing = decks.find((d) => d.packKey === pack.key) ?? decks.find((d) => d.name === pack.name)
    if (existing) await syncPackDeck(existing, pack)
    else if (!installed.get(pack.key)) fresh.push(pack)
  }
  await writeDecks(fresh, japanTravelTags)
  try {
    for (const d of outdated) localStorage.setItem(packFlag(d.key), String(d.version))
  } catch {
    // Ignore: the next run finds the decks by pack key and only re-syncs them.
  }
}

async function syncPackDeck(deck: Deck, pack: PackDeck) {
  const cards = await db.cards.where('deckId').equals(deck.id).toArray()
  const byFront = new Map(cards.map((c) => [c.front, c]))
  const seedExtra = new Map(pack.cards.map((c) => [c.front, c.extra ?? '']))
  const tagId = await ensureTags(japanTravelTags)
  const base = Date.now()
  const added = pack.cards
    .filter((c) => !byFront.has(c.front))
    .map((c, i) => buildCard(c, deck.id, base + i, tagId))
  const filled = cards.filter((c) => !c.extra.trim() && seedExtra.get(c.front))

  await db.transaction('rw', [db.decks, db.cards], async () => {
    if (deck.packKey !== pack.key) await db.decks.update(deck.id, { packKey: pack.key })
    for (const c of filled) await db.cards.update(c.id, { extra: seedExtra.get(c.front), updatedAt: base })
    await db.cards.bulkAdd(added)
  })
}

/** Returns tag ids by name, creating the tags that do not exist yet. */
async function ensureTags(seedTagList: { name: string; color: ColorName }[]): Promise<Map<string, string>> {
  const base = Date.now()
  const tagId = new Map((await db.tags.toArray()).map((t) => [t.name, t.id]))
  const tags: Tag[] = seedTagList
    .filter((t) => !tagId.has(t.name))
    .map((t, i) => ({ id: uid('tag'), ...t, createdAt: base + i }))
  await db.tags.bulkAdd(tags)
  for (const t of tags) tagId.set(t.name, t.id)
  return tagId
}

function buildCard(c: SeedCard, deckId: string, ts: number, tagId: Map<string, string>): Flashcard {
  return {
    id: uid('card'),
    deckId,
    front: c.front,
    back: c.back,
    hint: c.hint ?? '',
    extra: c.extra ?? '',
    tagIds: (c.tags ?? []).map((n) => tagId.get(n)).filter((id): id is string => Boolean(id)),
    starred: false,
    ...newSchedule(ts),
    createdAt: ts,
    updatedAt: ts,
  }
}

/** Writes decks with their cards, reusing existing tags of the same name. */
async function writeDecks(seeds: (SeedDeck | PackDeck)[], seedTagList: { name: string; color: ColorName }[]) {
  if (seeds.length === 0) return
  const base = Date.now()
  const tagId = await ensureTags(seedTagList)

  const decks: Deck[] = []
  const cards: Flashcard[] = []
  let tick = 0
  for (const seed of seeds) {
    const deck: Deck = {
      id: uid('deck'),
      name: seed.name,
      description: seed.description,
      color: seed.color,
      ...('key' in seed && { packKey: seed.key }),
      createdAt: base + tick,
      updatedAt: base + tick,
    }
    decks.push(deck)
    for (const c of seed.cards) {
      tick += 1
      cards.push(buildCard(c, deck.id, base + tick, tagId))
    }
  }

  await db.transaction('rw', [db.decks, db.cards], async () => {
    await db.decks.bulkAdd(decks)
    await db.cards.bulkAdd(cards)
  })
}

const SAMPLE_CLEANUP_KEY = 'yozuanki-sample-cleanup'

/**
 * One-time cleanup for browsers that were auto-seeded before sample data became
 * opt-in. Only removes decks whose name and every card match the samples, and
 * sample-named tags that no remaining card uses — user content is left alone.
 */
export async function removeSampleDataOnce() {
  try {
    if (localStorage.getItem(SAMPLE_CLEANUP_KEY)) return
  } catch {
    return
  }
  await removeSampleData()
  try {
    localStorage.setItem(SAMPLE_CLEANUP_KEY, '1')
  } catch {
    // Ignore: the cleanup is idempotent.
  }
}

async function removeSampleData() {
  const fronts = new Map(seedDecks.map((d) => [d.name, new Set(d.cards.map((c) => c.front))]))
  const sampleTagNames = new Set(seedTags.map((t) => t.name))

  await db.transaction('rw', [db.decks, db.cards, db.tags, db.reviews], async () => {
    for (const deck of await db.decks.toArray()) {
      const sampleFronts = fronts.get(deck.name)
      if (!sampleFronts) continue
      const cards = await db.cards.where('deckId').equals(deck.id).toArray()
      if (!cards.every((c) => sampleFronts.has(c.front))) continue
      const ids = cards.map((c) => c.id)
      await db.reviews.where('cardId').anyOf(ids).delete()
      await db.cards.bulkDelete(ids)
      await db.decks.delete(deck.id)
    }
    const usedTagIds = new Set((await db.cards.toArray()).flatMap((c) => c.tagIds))
    const orphanSampleTags = (await db.tags.toArray()).filter((t) => sampleTagNames.has(t.name) && !usedTagIds.has(t.id))
    await db.tags.bulkDelete(orphanSampleTags.map((t) => t.id))
  })
}
