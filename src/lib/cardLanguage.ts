import type { Flashcard } from '../types/card'

export type StudyLanguage = 'en' | 'ja'
export type LanguageFilter = 'all' | StudyLanguage

export const languageFilterLabels: Record<LanguageFilter, string> = {
  all: '全部',
  en: '英文',
  ja: '日文',
}

const KANA = /[぀-ヿㇰ-ㇿ]/
const HAN = /[一-鿿㐀-䶿]/
const LATIN = /[A-Za-z]/

/**
 * Guesses which language a card teaches from its front. Kana means Japanese;
 * Han without any Latin is treated as Japanese too (the backs carry the
 * Chinese); Latin alone is English. Mixed Han + Latin (e.g. a Chinese question
 * about `useEffect`) is neither.
 */
export function cardLanguage(card: Pick<Flashcard, 'front'>): StudyLanguage | undefined {
  const text = card.front
  if (KANA.test(text)) return 'ja'
  const han = HAN.test(text)
  const latin = LATIN.test(text)
  if (han && !latin) return 'ja'
  if (latin && !han) return 'en'
  return undefined
}

export function matchesLanguage(card: Pick<Flashcard, 'front'>, filter: LanguageFilter): boolean {
  return filter === 'all' || cardLanguage(card) === filter
}

/** A deck's language is the one most of its cards are in. */
export function deckLanguage(cards: Pick<Flashcard, 'front'>[]): StudyLanguage | undefined {
  const counts = { en: 0, ja: 0 }
  for (const c of cards) {
    const lang = cardLanguage(c)
    if (lang) counts[lang] += 1
  }
  if (counts.en === 0 && counts.ja === 0) return undefined
  return counts.en >= counts.ja ? 'en' : 'ja'
}
