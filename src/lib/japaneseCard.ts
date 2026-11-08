import type { Flashcard } from '../types/card'
import { backSpeechText } from './speech'

const KANA = /[぀-ヿ]/
const JAPANESE = /[぀-ヿ一-鿿㐀-䶿]/

export const JA = 'ja-JP'

/** A Japanese vocabulary card split into its parts, read from the existing fields. */
export interface JapaneseParts {
  kanji: string
  kana: string
  meaning: string
  exampleJa: string
  exampleKana: string
  exampleZh: string
}

/** "駅まで歩いて5分です。（走到車站 5 分鐘。）" → ["駅まで歩いて5分です。", "走到車站 5 分鐘。"] */
export function splitExample(extra: string): { ja: string; zh: string } {
  const text = extra.trim()
  const m = /^([\s\S]*?)（([^）]*)）\s*$/.exec(text)
  return m ? { ja: m[1].trim(), zh: m[2].trim() } : { ja: text, zh: '' }
}

/**
 * Recognises cards written as front "駅", back "えき — 車站", extra "例句（翻譯）".
 * Returns null for anything else so those cards keep their plain front/back display.
 */
export function japaneseParts(
  card: Pick<Flashcard, 'front' | 'back' | 'extra' | 'exampleKana' | 'cardType'>,
): JapaneseParts | null {
  if (isSentence(card)) return null
  const m = /^([\s\S]+?)\s[—–]\s([\s\S]+)$/.exec(card.back.trim())
  if (!m || !JAPANESE.test(card.front)) return null
  const kana = m[1].trim()
  if (!KANA.test(kana)) return null
  const example = splitExample(card.extra)
  return {
    kanji: card.front.trim(),
    kana,
    meaning: m[2].trim(),
    exampleJa: example.ja,
    exampleKana: card.exampleKana?.trim() ?? '',
    exampleZh: example.zh,
  }
}

export function isSentence(card: Pick<Flashcard, 'cardType'>): boolean {
  return card.cardType === 'sentence'
}

/** Kana is shown with spaces between words; the voice reads the original sentence so those spaces never become pauses. */
export function sentenceSpeech(card: Pick<Flashcard, 'front'>): SpeechLine {
  return { text: card.front.trim(), lang: JA }
}

export interface SpeechLine {
  text: string
  lang?: string
}

/** Japanese cards are always read by a Japanese voice from the kana, so 駅 is never read as Chinese. */
export function frontSpeech(card: Flashcard): SpeechLine {
  if (isSentence(card)) return sentenceSpeech(card)
  const parts = japaneseParts(card)
  return parts ? { text: parts.kana, lang: JA } : { text: card.front }
}

export function backSpeech(card: Flashcard): SpeechLine {
  if (isSentence(card)) return sentenceSpeech(card)
  const parts = japaneseParts(card)
  return parts ? { text: parts.kana, lang: JA } : { text: backSpeechText(card.back) }
}
