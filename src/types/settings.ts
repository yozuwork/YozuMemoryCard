export type StudyOrder = 'review-first' | 'new-first' | 'mixed'
export type ThemeMode = 'system' | 'light' | 'dark'
/** What the front of a Japanese card shows: kanji, kana only, or nothing but audio. */
export type StudyMode = 'kanji' | 'kana' | 'listen'
/** What the front of a sentence card shows. */
export type SentenceMode = 'kana' | 'kanji'

export interface Settings {
  speechRate: number
  /** BCP-47 codes, most preferred first. */
  languageOrder: string[]
  autoSpeakFront: boolean
  autoSpeakBack: boolean
  studyMode: StudyMode
  sentenceMode: SentenceMode
  showExampleKana: boolean
  showExampleZh: boolean

  studyOrder: StudyOrder
  newPerDay: number
  reviewsPerDay: number
  /** Hour (0–23) at which a new study day begins. */
  dayStartHour: number
  /** Target probability of recall used by FSRS (0.7–0.97). */
  retention: number
  reminderEnabled: boolean
  /** HH:mm */
  reminderTime: string

  theme: ThemeMode
}
