import { db } from './schema'
import { uid } from '../lib/id'
import { newSchedule } from '../lib/scheduler'
import { seedDecks, seedTags, type SeedCard, type SeedDeck } from '../data/mockData'
import { japanTravelDecks, japanTravelTags, type PackDeck } from '../data/japanTravelDecks'
import { exampleKana } from '../data/exampleKana'
import { splitExample } from '../lib/japaneseCard'
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
 * and empty examples and example readings filled in, while the user's edits
 * and progress are kept.
 * A deck the user deletes stays deleted; one that already exists by name is
 * adopted rather than duplicated. Memoised so concurrent callers (e.g.
 * StrictMode's double effect) share one run.
 */
export function installJapanTravelDecks(): Promise<void> {
  installing ??= syncJapanTravelDecks().then(
    () => undefined,
    (e: unknown) => {
      // Let a later launch (or call) try again.
      installing = undefined
      throw e
    },
  )
  return installing
}

/** localStorage value: the pack version last installed ('1' from before versioning). */
const packFlag = (key: string) => `yozuanki-pack-${key}`

type SeedTag = { name: string; color: ColorName }

export interface BuiltInPacks {
  packs: PackDeck[]
  tags: SeedTag[]
}

/** Every built-in pack. The 大阪旅行 series is a separate chunk, fetched only when a sync runs. */
export async function loadBuiltInPacks(): Promise<BuiltInPacks> {
  const { osakaDecks, osakaTags } = await import('../data/osaka')
  return { packs: [...japanTravelDecks, ...osakaDecks], tags: [...japanTravelTags, ...osakaTags] }
}

export interface SyncReport {
  /** Pack keys brought up to their current version. */
  synced: string[]
  /** Pack keys that failed; they keep their old version and are retried on the next launch. */
  failed: string[]
}

/** Unmemoised install / sync run; exported for tests. */
export async function syncJapanTravelDecks(): Promise<SyncReport> {
  const report: SyncReport = { synced: [], failed: [] }
  const { packs, tags } = await loadBuiltInPacks()
  let installed: Map<string, number>
  try {
    installed = new Map(packs.map((d) => [d.key, Number(localStorage.getItem(packFlag(d.key))) || 0]))
  } catch {
    return report
  }
  const outdated = packs.filter((d) => (installed.get(d.key) ?? 0) < d.version)
  if (outdated.length === 0) return report

  const decks = await db.decks.toArray()
  const fresh: PackDeck[] = []
  // Each existing deck syncs on its own, so one failure never blocks the others.
  for (const pack of outdated) {
    const existing = decks.find((d) => d.packKey === pack.key) ?? decks.find((d) => d.name === pack.name)
    if (existing) {
      try {
        await syncPackDeck(existing, pack, tags)
        report.synced.push(pack.key)
      } catch (e) {
        console.error(`內建牌組「${pack.name}」同步失敗，下次開啟時會重試`, e)
        report.failed.push(pack.key)
      }
    } else if (!installed.get(pack.key)) fresh.push(pack)
    else report.synced.push(pack.key) // Deleted by the user: stays deleted.
  }
  // New decks go in one transaction, so a failure leaves nothing half-installed.
  try {
    await writeDecks(fresh, tags)
    report.synced.push(...fresh.map((d) => d.key))
  } catch (e) {
    console.error('內建牌組安裝失敗，下次開啟時會重試', e)
    report.failed.push(...fresh.map((d) => d.key))
  }
  try {
    for (const d of outdated) if (report.synced.includes(d.key)) localStorage.setItem(packFlag(d.key), String(d.version))
  } catch {
    // Ignore: the next run finds the decks by pack key and only re-syncs them.
  }
  return report
}

async function syncPackDeck(deck: Deck, pack: PackDeck, seedTags: SeedTag[]) {
  const cards = await db.cards.where('deckId').equals(deck.id).toArray()
  const byFront = new Map(cards.map((c) => [c.front, c]))
  const seedByFront = new Map(pack.cards.map((c) => [c.front, c]))
  const tagId = await ensureTags(seedTags)
  const base = Date.now()
  const added = pack.cards
    .filter((c) => !byFront.has(c.front))
    .map((c, i) => buildCard(c, deck.id, base + i, tagId))
  const filled = cards.filter((c) => !c.extra.trim() && seedByFront.get(c.front)?.extra)
  const readings = cards
    .filter((c) => !c.exampleKana)
    .map((c) => {
      const seed = seedByFront.get(c.front)
      return [c, readingFor(c.extra || seed?.extra || '', seed)] as const
    })
    .filter(([, kana]) => kana)

  await db.transaction('rw', [db.decks, db.cards], async () => {
    if (deck.packKey !== pack.key) await db.decks.update(deck.id, { packKey: pack.key })
    for (const c of filled) await db.cards.update(c.id, { extra: seedByFront.get(c.front)?.extra, updatedAt: base })
    for (const [c, kana] of readings) await db.cards.update(c.id, { exampleKana: kana })
    await db.cards.bulkAdd(added)
  })
}

/** Returns tag ids by name, creating the tags that do not exist yet. */
async function ensureTags(seedTagList: SeedTag[]): Promise<Map<string, string>> {
  const base = Date.now()
  const tagId = new Map((await db.tags.toArray()).map((t) => [t.name, t.id]))
  const tags: Tag[] = seedTagList
    .filter((t) => !tagId.has(t.name))
    .map((t, i) => ({ id: uid('tag'), ...t, createdAt: base + i }))
  await db.tags.bulkAdd(tags)
  for (const t of tags) tagId.set(t.name, t.id)
  return tagId
}

/** Built-in reading for an example sentence, if there is one. */
function kanaFor(extra: string): string | undefined {
  return exampleKana[splitExample(extra).ja]
}

/** The seed's own reading applies only while the card still has the seed's example. */
function readingFor(extra: string, seed: SeedCard | undefined): string | undefined {
  if (seed?.exampleKana && extra === seed.extra) return seed.exampleKana
  return kanaFor(extra)
}

function buildCard(c: SeedCard, deckId: string, ts: number, tagId: Map<string, string>): Flashcard {
  const kana = readingFor(c.extra ?? '', c)
  return {
    id: uid('card'),
    deckId,
    front: c.front,
    back: c.back,
    hint: c.hint ?? '',
    extra: c.extra ?? '',
    ...(kana && { exampleKana: kana }),
    ...(c.cardType && { cardType: c.cardType }),
    ...(c.sentenceKana && { sentenceKana: c.sentenceKana }),
    ...(c.vocabulary && { vocabulary: c.vocabulary }),
    tagIds: (c.tags ?? []).map((n) => tagId.get(n)).filter((id): id is string => Boolean(id)),
    starred: false,
    seeded: true,
    ...newSchedule(ts),
    createdAt: ts,
    updatedAt: ts,
  }
}

/** Writes decks with their cards, reusing existing tags of the same name. */
async function writeDecks(seeds: (SeedDeck | PackDeck)[], seedTagList: SeedTag[]) {
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
