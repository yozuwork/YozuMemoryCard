export interface LanguageOption {
  code: string
  label: string
  sample: string
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'zh-TW', label: '中文（台灣）', sample: '今天也要好好複習' },
  { code: 'en-US', label: 'English (US)', sample: 'Practice makes perfect' },
  { code: 'ja-JP', label: '日本語', sample: '毎日少しずつ覚えましょう' },
  { code: 'ko-KR', label: '한국어', sample: '매일 조금씩 공부해요' },
  { code: 'zh-CN', label: '中文（简体）', sample: '今天也要好好复习' },
  { code: 'en-GB', label: 'English (UK)', sample: 'Practice makes perfect' },
  { code: 'fr-FR', label: 'Français', sample: 'C’est en forgeant qu’on devient forgeron' },
  { code: 'de-DE', label: 'Deutsch', sample: 'Übung macht den Meister' },
  { code: 'es-ES', label: 'Español', sample: 'La práctica hace al maestro' },
]

export const DEFAULT_LANGUAGE_ORDER = ['zh-TW', 'en-US', 'ja-JP', 'ko-KR', 'zh-CN', 'en-GB', 'fr-FR', 'de-DE', 'es-ES']

const KANA = /[぀-ヿㇰ-ㇿ]/
const HANGUL = /[가-힯ᄀ-ᇿ]/
const HAN = /[一-鿿㐀-䶿]/
const LATIN = /[A-Za-zÀ-ɏ]/

/** Language prefixes that could plausibly read `text`, based on its script. */
export function scriptCandidates(text: string): string[] {
  if (KANA.test(text)) return ['ja']
  if (HANGUL.test(text)) return ['ko']
  if (HAN.test(text)) return ['zh', 'ja']
  if (LATIN.test(text)) return ['en', 'fr', 'de', 'es']
  return []
}

/**
 * Picks a voice language for `text`: the first language in the user's order whose
 * script matches. Han characters alone are ambiguous (Chinese or Japanese), so
 * the order decides; kana always means Japanese.
 */
export function detectLanguage(text: string, order: string[]): string {
  const candidates = scriptCandidates(text)
  if (candidates.length === 0) return order[0] ?? 'zh-TW'
  const preferred = order.find((code) => candidates.includes(code.split('-')[0]))
  if (preferred) return preferred
  const fallback = DEFAULT_LANGUAGE_ORDER.find((code) => code.startsWith(candidates[0]))
  return fallback ?? 'en-US'
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const norm = (s: string) => s.replace('_', '-').toLowerCase()
  return (
    voices.find((v) => norm(v.lang) === lang.toLowerCase() && v.localService) ??
    voices.find((v) => norm(v.lang) === lang.toLowerCase()) ??
    voices.find((v) => norm(v.lang).startsWith(lang.split('-')[0].toLowerCase()))
  )
}

/** Drops full-width parenthesised translations so only the example itself is read: "駅はどこですか。（車站在哪？）" → "駅はどこですか。" */
export function exampleSpeechText(text: string): string {
  return text.replace(/（[^）]*）/g, ' ').replace(/\s+/g, ' ').trim()
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}

export interface SpeakOptions {
  rate: number
  order: string[]
  lang?: string
}

/** Resolves when the utterance finishes (or is cancelled / errors). */
export function speak(text: string, { rate, order, lang }: SpeakOptions): Promise<void> {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!isSpeechSupported() || !clean) return Promise.resolve()
  const synth = window.speechSynthesis
  synth.cancel()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = lang ?? detectLanguage(clean, order)
    const voice = pickVoice(u.lang)
    if (voice) u.voice = voice
    u.rate = Math.min(2, Math.max(0.5, rate))
    u.onend = () => resolve()
    u.onerror = () => resolve()
    synth.speak(u)
    // Some Chromium builds pause long queues; resume() is a harmless nudge.
    if (synth.paused) synth.resume()
  })
}
