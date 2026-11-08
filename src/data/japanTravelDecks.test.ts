import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { japanTravelDecks } from './japanTravelDecks'
import { db } from '../db/schema'
import { loadBuiltInPacks, syncJapanTravelDecks } from '../db/seed'
import { buildBackup, parseBackup } from '../db/backup'
import { computeCharacter } from '../lib/character'
import { backSpeechText, exampleSpeechText } from '../lib/speech'
import { frontSpeech, japaneseParts, splitExample } from '../lib/japaneseCard'
import { exampleKana } from './exampleKana'
import { seedDecks } from './mockData'

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
    const { packs } = await loadBuiltInPacks()
    const first = await syncJapanTravelDecks()
    const second = await syncJapanTravelDecks()
    expect(first.synced.sort()).toEqual(packs.map((d) => d.key).sort())
    expect(first.failed).toEqual([])
    expect(second.synced).toEqual([])
    const decks = await db.decks.toArray()
    expect(decks.map((d) => d.packKey).sort()).toEqual(packs.map((d) => d.key).sort())
    expect(await db.cards.count()).toBe(packs.reduce((n, d) => n + d.cards.length, 0))
    // Every installed card starts new.
    expect(await db.cards.where('state').notEqual(0).count()).toBe(0)
  })

  it('keeps edits and progress, and only adds missing cards, when a pack is re-synced', async () => {
    const { packs } = await loadBuiltInPacks()
    await syncJapanTravelDecks()
    const card = (await db.cards.toArray())[0]
    await db.cards.update(card.id, { back: '我改過的背面', reps: 3, state: 2 })
    const deck = (await db.decks.get(card.deckId))!
    const removed = (await db.cards.where('deckId').equals(deck.id).toArray()).find((c) => c.id !== card.id)!
    await db.cards.delete(removed.id)
    for (const d of packs) store.set(`yozuanki-pack-${d.key}`, String(d.version - 1))

    await syncJapanTravelDecks()

    const after = (await db.cards.get(card.id))!
    expect(after.back).toBe('我改過的背面')
    expect(after.reps).toBe(3)
    expect(await db.cards.where({ deckId: deck.id, front: removed.front }).count()).toBe(1)
    expect(await db.cards.count()).toBe(packs.reduce((n, d) => n + d.cards.length, 0))
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

  it('reads only the reading on the back, not its meaning', () => {
    expect(backSpeechText('しんかんせん — 新幹線')).toBe('しんかんせん')
    expect(backSpeechText('にがて — 不擅長、棘手')).toBe('にがて')
    expect(backSpeechText('蘋果')).toBe('蘋果')
  })
})

describe('example readings', () => {
  it('has a kana reading for every built-in Japanese example', () => {
    for (const deck of [...japanTravelDecks, ...seedDecks.filter((d) => d.name.startsWith('日文'))]) {
      for (const c of deck.cards.filter((card) => card.cardType !== 'sentence')) {
        const ja = splitExample(c.extra ?? '').ja
        expect(exampleKana[ja], `${deck.name} · ${c.front}`).toBeTruthy()
      }
    }
  })

  it('fills readings into an older install without touching progress', async () => {
    await syncJapanTravelDecks()
    const [card] = await db.cards.toArray()
    await db.cards.update(card.id, { exampleKana: undefined, reps: 4, due: 123 })
    for (const d of japanTravelDecks) store.set(`yozuanki-pack-${d.key}`, '2')

    await syncJapanTravelDecks()

    const after = (await db.cards.get(card.id))!
    expect(after.exampleKana).toBe(exampleKana[splitExample(card.extra).ja])
    expect(after.reps).toBe(4)
    expect(after.due).toBe(123)
  })
})

describe('sentence cards', () => {
  it('give every built-in sentence a kana version, translation and key words', () => {
    const sentences = japanTravelDecks.flatMap((d) => d.cards).filter((c) => c.cardType === 'sentence')
    expect(sentences.length).toBeGreaterThan(0)
    for (const c of sentences) {
      expect(c.sentenceKana, c.front).toBeTruthy()
      expect(c.back, c.front).toBeTruthy()
      expect(c.vocabulary?.length, c.front).toBeGreaterThan(0)
    }
  })

  it('installs sentence cards with their type and are never parsed as vocabulary', async () => {
    await syncJapanTravelDecks()
    const card = (await db.cards.toArray()).find((c) => c.front === '次の駅で乗り換えてください。')!
    expect(card.cardType).toBe('sentence')
    expect(card.sentenceKana).toBe('つぎ の えき で のりかえて ください。')
    expect(card.vocabulary?.[2]).toEqual({ word: '乗り換える', reading: 'のりかえる', meaning: '轉乘' })
    expect(japaneseParts(card)).toBeNull()
    expect(frontSpeech(card)).toEqual({ text: '次の駅で乗り換えてください。', lang: 'ja-JP' })
  })
})

describe('sentence cards in backups', () => {
  it('keep their type, kana and key words through export and import', async () => {
    await syncJapanTravelDecks()
    const restored = parseBackup(JSON.parse(JSON.stringify(await buildBackup())))
    const card = restored.cards.find((c) => c.front === '次の駅で乗り換えてください。')!
    expect(card.cardType).toBe('sentence')
    expect(card.sentenceKana).toBe('つぎ の えき で のりかえて ください。')
    expect(card.vocabulary).toHaveLength(3)
    const vocab = restored.cards.find((c) => c.front === '駅')!
    expect(vocab.cardType).toBeUndefined()
    expect(vocab.exampleKana).toBe('えきまで あるいて ごふんです。')
  })
})

describe('built-in decks and character EXP', () => {
  it('earn no card-creation EXP, so installing them never levels the character up', async () => {
    await syncJapanTravelDecks()
    const cards = await db.cards.toArray()
    expect(cards.every((c) => c.seeded)).toBe(true)
    const progress = computeCharacter(cards, [], Date.now(), 4)
    expect(progress.level.total).toBe(0)
  })
})
