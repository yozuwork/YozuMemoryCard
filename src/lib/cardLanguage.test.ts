import { describe, expect, it } from 'vitest'
import { cardLanguage, deckLanguage, matchesLanguage } from './cardLanguage'

describe('cardLanguage', () => {
  it('detects Japanese from kana or Han-only fronts', () => {
    expect(cardLanguage({ front: '確認する' })).toBe('ja')
    expect(cardLanguage({ front: 'にがて' })).toBe('ja')
    expect(cardLanguage({ front: '経験' })).toBe('ja')
  })

  it('detects English from Latin-only fronts', () => {
    expect(cardLanguage({ front: 'confirm' })).toBe('en')
    expect(cardLanguage({ front: "It's a deal!" })).toBe('en')
  })

  it('leaves mixed or empty fronts unclassified', () => {
    expect(cardLanguage({ front: 'useEffect 的第二個參數是什麼？' })).toBeUndefined()
    expect(cardLanguage({ front: '' })).toBeUndefined()
  })

  it('"all" matches everything', () => {
    expect(matchesLanguage({ front: '' }, 'all')).toBe(true)
    expect(matchesLanguage({ front: 'confirm' }, 'ja')).toBe(false)
  })

  it('assigns a deck the majority language of its cards', () => {
    expect(deckLanguage([{ front: '相談' }, { front: '苦手' }, { front: 'OK' }])).toBe('ja')
    expect(deckLanguage([{ front: 'deadline' }])).toBe('en')
    expect(deckLanguage([])).toBeUndefined()
  })
})
