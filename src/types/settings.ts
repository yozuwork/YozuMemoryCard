export type StudyOrder = 'review-first' | 'new-first' | 'mixed'
export type ThemeMode = 'system' | 'light' | 'dark'

export interface Settings {
  speechRate: number
  /** BCP-47 codes, most preferred first. */
  languageOrder: string[]
  autoSpeakFront: boolean
  autoSpeakBack: boolean

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
