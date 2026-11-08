import { describe, expect, it } from 'vitest'
import { japaneseParts, splitExample } from './japaneseCard'

const eki = { front: '駅', back: 'えき — 車站', extra: '駅まで歩いて5分です。（走到車站 5 分鐘。）', exampleKana: 'えきまで あるいて ごふんです。' }

describe('japaneseParts', () => {
  it('splits a vocabulary card into word, reading, meaning and example', () => {
    expect(japaneseParts(eki)).toEqual({
      kanji: '駅',
      kana: 'えき',
      meaning: '車站',
      exampleJa: '駅まで歩いて5分です。',
      exampleKana: 'えきまで あるいて ごふんです。',
      exampleZh: '走到車站 5 分鐘。',
    })
  })

  it('works for older cards without an example reading', () => {
    const parts = japaneseParts({ ...eki, exampleKana: undefined, extra: '' })
    expect(parts?.exampleKana).toBe('')
    expect(parts?.exampleJa).toBe('')
  })

  it('ignores cards that are not Japanese vocabulary', () => {
    expect(japaneseParts({ front: 'confirm', back: '確認、證實', extra: '' })).toBeNull()
    expect(japaneseParts({ front: '什麼是 Virtual DOM？', back: 'UI 樹 — 記憶體中的表示', extra: '' })).toBeNull()
  })

  it('keeps a meaning that itself contains parentheses', () => {
    expect(japaneseParts({ front: '特急', back: 'とっきゅう — 特急（通常需另購特急券）', extra: '' })?.meaning).toBe('特急（通常需另購特急券）')
  })
})

describe('splitExample', () => {
  it('separates the translation in full-width parentheses', () => {
    expect(splitExample('何名様ですか。——二人です。（請問幾位？——兩位。）')).toEqual({ ja: '何名様ですか。——二人です。', zh: '請問幾位？——兩位。' })
    expect(splitExample('例文だけ')).toEqual({ ja: '例文だけ', zh: '' })
  })
})
