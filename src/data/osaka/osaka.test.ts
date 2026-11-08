import { describe, expect, it } from 'vitest'
import type { PackDeck } from '../japanTravelDecks'
import { japaneseParts, splitExample } from '../../lib/japaneseCard'

// Picks up every decksNNtoNN.ts file, so each part can be checked as soon as it exists.
const modules = import.meta.glob<Record<string, PackDeck[]>>('./decks*.ts', { eager: true })
const decks = Object.values(modules).flatMap((m) => Object.values(m).flat())

const KANA_ONLY = /^[぀-ゟ゠-ヿー〜・\s]+$/
const KANJI = /[一-鿿㐀-䶿々]/

describe('大阪旅行 decks', () => {
  it('name, key and size follow the series format', () => {
    for (const d of decks) {
      const n = d.key.slice(-2)
      expect(d.key, d.name).toMatch(/^osaka-\d{2}$/)
      expect(d.name, d.key).toMatch(new RegExp(`^大阪 ${n}｜\\S`))
      expect(d.version, d.name).toBeGreaterThanOrEqual(1)
      expect(d.description.trim(), d.name).toBeTruthy()
      expect(d.cards, d.name).toHaveLength(30)
    }
    const keys = decks.map((d) => d.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('every card is a complete Japanese vocabulary card', () => {
    for (const d of decks) {
      for (const c of d.cards) {
        const at = `${d.name} · ${c.front}`
        const parts = japaneseParts({ front: c.front, back: c.back, extra: c.extra ?? '', exampleKana: c.exampleKana })
        expect(parts, `${at}: back must be "reading — 意思"`).not.toBeNull()
        expect(c.back.split(' — '), `${at}: exactly one " — " in back`).toHaveLength(2)
        expect(parts!.kana, `${at}: reading must be kana only`).toMatch(KANA_ONLY)
        expect(parts!.meaning, at).toBeTruthy()

        const ex = splitExample(c.extra ?? '')
        expect(ex.ja, `${at}: example`).toBeTruthy()
        expect(ex.zh, `${at}: example needs （繁中翻譯）`).toBeTruthy()
        expect(ex.ja, `${at}: one translation only`).not.toMatch(/[（）]/)

        expect(c.exampleKana, `${at}: exampleKana`).toBeTruthy()
        expect(c.exampleKana, `${at}: exampleKana has no kanji`).not.toMatch(KANJI)
        expect(c.exampleKana, `${at}: exampleKana is split into words`).toMatch(/\S \S/)
        expect(c.tags?.[0], at).toBe('大阪旅行')
      }
    }
  })

  it('does not repeat a word across the series', () => {
    const seen = new Map<string, string>()
    const dupes: string[] = []
    for (const d of decks) {
      for (const c of d.cards) {
        const prev = seen.get(c.front)
        if (prev) dupes.push(`${c.front}: ${prev} / ${d.name}`)
        else seen.set(c.front, d.name)
      }
    }
    expect(dupes).toEqual([])
  })
})

describe('大阪旅行 series as a whole', () => {
  it('has all 18 decks, 01–18 in order, 540 cards', async () => {
    const { osakaDecks } = await import('./index')
    expect(osakaDecks.map((d) => d.key)).toEqual(Array.from({ length: 18 }, (_, i) => `osaka-${String(i + 1).padStart(2, '0')}`))
    expect(osakaDecks.reduce((n, d) => n + d.cards.length, 0)).toBe(540)
  })
})
