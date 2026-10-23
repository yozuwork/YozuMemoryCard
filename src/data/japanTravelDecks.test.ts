import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { japanTravelDecks } from './japanTravelDecks'
import { db } from '../db/schema'
import { syncJapanTravelDecks } from '../db/seed'
import { exampleSpeechText } from '../lib/speech'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

beforeEach(async () => {
  store.clear()
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('built-in travel decks', () => {
  it('gives every card an example sentence and unique fronts', () => {
    for (const deck of japanTravelDecks) {
      const fronts = deck.cards.map((c) => c.front)
      expect(new Set(fronts).size, deck.name).toBe(fronts.length)
      for (const c of deck.cards) expect(c.extra?.trim(), `${deck.name} · ${c.front}`).toBeTruthy()
    }
  })

  it('installs each pack once, linked to its cover', async () => {
    await syncJapanTravelDecks()
    await syncJapanTravelDecks()
    const decks = await db.decks.toArray()
    expect(decks.map((d) => d.packKey).sort()).toEqual(japanTravelDecks.map((d) => d.key).sort())
    expect(await db.cards.count()).toBe(japanTravelDecks.reduce((n, d) => n + d.cards.length, 0))
  })

  it('upgrades an older install: adds new cards, fills empty examples, keeps user edits', async () => {
    const pack = japanTravelDecks[1]
    await syncJapanTravelDecks()
    const deck = (await db.decks.toArray()).find((d) => d.packKey === pack.key)!
    // Simulate a v1 install: no pack key, one card missing, one example empty, one edited.
    await db.decks.update(deck.id, { packKey: undefined })
    const cards = await db.cards.where('deckId').equals(deck.id).sortBy('createdAt')
    await db.cards.delete(cards[0].id)
    await db.cards.update(cards[1].id, { extra: '' })
    await db.cards.update(cards[2].id, { extra: '我的筆記' })
    for (const d of japanTravelDecks) store.set(`yozuanki-pack-${d.key}`, '1')

    await syncJapanTravelDecks()

    expect((await db.decks.get(deck.id))?.packKey).toBe(pack.key)
    const after = await db.cards.where('deckId').equals(deck.id).toArray()
    expect(after).toHaveLength(pack.cards.length)
    expect(after.find((c) => c.id === cards[1].id)?.extra).toBe(pack.cards.find((c) => c.front === cards[1].front)?.extra)
    expect(after.find((c) => c.id === cards[2].id)?.extra).toBe('我的筆記')
  })

  it('leaves a deleted pack deleted', async () => {
    await syncJapanTravelDecks()
    const first = (await db.decks.toArray()).find((d) => d.packKey === japanTravelDecks[0].key)!
    await db.cards.where('deckId').equals(first.id).delete()
    await db.decks.delete(first.id)
    store.set(`yozuanki-pack-${japanTravelDecks[0].key}`, '1')
    await syncJapanTravelDecks()
    expect(await db.decks.where('name').equals(japanTravelDecks[0].name).count()).toBe(0)
  })

  it('reads only the example, not its translation', () => {
    expect(exampleSpeechText('駅はどこですか。（車站在哪？）')).toBe('駅はどこですか。')
    expect(exampleSpeechText('（只有翻譯）')).toBe('')
  })
})
