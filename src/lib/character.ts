import { CardState, Rating, type Flashcard, type ReviewLogEntry } from '../types/card'
import { cardLanguage, type StudyLanguage } from './cardLanguage'
import { studyDayKey } from './time'

// Character progression, derived entirely from cards and review history so it
// survives backups / restores and follows 重置學習進度 without extra storage.

/** EXP for one review, by rating. Learning a card for the first time earns a bonus. */
export const REVIEW_XP: Record<Rating, number> = {
  [Rating.Again]: 2,
  [Rating.Hard]: 4,
  [Rating.Good]: 6,
  [Rating.Easy]: 8,
}
export const FIRST_LEARN_BONUS = 4
export const CARD_CREATED_XP = 2
export const QUEST_XP = 20

export function reviewXp(log: Pick<ReviewLogEntry, 'rating' | 'state'>): number {
  return REVIEW_XP[log.rating] + (log.state === CardState.New ? FIRST_LEARN_BONUS : 0)
}

/* ------------------------------------------------------------------ levels */

/** EXP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 100 + (level - 1) * 40
}

export interface LevelInfo {
  level: number
  /** EXP earned inside the current level. */
  into: number
  /** EXP the current level needs in total. */
  need: number
  total: number
}

export function levelFromXp(total: number): LevelInfo {
  let level = 1
  let rest = total
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level)
    level += 1
  }
  return { level, into: rest, need: xpToNext(level), total }
}

const TITLES: [number, string][] = [
  [50, '萬語之王'],
  [35, '傳說譯者'],
  [20, '語言賢者'],
  [12, '詠唱術士'],
  [6, '單字獵人'],
  [3, '啟程旅人'],
  [1, '見習冒險者'],
]

export function titleForLevel(level: number): string {
  return TITLES.find(([min]) => level >= min)![1]
}

/* ------------------------------------------------------------------ quests */

export type QuestScope = 'common' | StudyLanguage

export interface Quest {
  id: string
  scope: QuestScope
  title: string
  detail: string
  progress: number
  target: number
  done: boolean
  icon: 'learn' | 'review' | 'accuracy' | 'create' | 'checkin' | 'focus'
}

interface DayActivity {
  logs: ReviewLogEntry[]
  created: number
}

const LANG_NAME: Record<StudyLanguage, string> = { ja: '日文', en: '英文' }

/** Languages that get their own daily quests. English is paused for now. */
export const QUEST_LANGUAGES: StudyLanguage[] = ['ja']

/** The quests for one study day, given that day's reviews and created cards. */
export function questsForDay({ logs, created }: DayActivity, langOf: (cardId: string) => StudyLanguage | undefined): Quest[] {
  const quest = (q: Omit<Quest, 'done'>): Quest => ({ ...q, progress: Math.min(q.progress, q.target), done: q.progress >= q.target })

  const minutes = Math.floor(logs.reduce((sum, l) => sum + l.durationMs, 0) / 60_000)
  const out: Quest[] = [
    quest({ id: 'checkin', scope: 'common', icon: 'checkin', title: '每日打卡', detail: '完成至少 1 次複習', progress: logs.length > 0 ? 1 : 0, target: 1 }),
    quest({ id: 'create', scope: 'common', icon: 'create', title: '新增筆記', detail: '新增 3 張卡片', progress: created, target: 3 }),
    quest({ id: 'focus', scope: 'common', icon: 'focus', title: '專注修練', detail: '累積學習 15 分鐘', progress: minutes, target: 15 }),
  ]

  for (const lang of QUEST_LANGUAGES) {
    const mine = logs.filter((l) => langOf(l.cardId) === lang)
    const learned = new Set(mine.filter((l) => l.state === CardState.New).map((l) => l.cardId)).size
    const correct = mine.filter((l) => l.rating >= Rating.Good).length
    const name = LANG_NAME[lang]
    out.push(
      quest({ id: `${lang}-learn`, scope: lang, icon: 'learn', title: `學習${name}新卡`, detail: `學會 10 張${name}新卡片`, progress: learned, target: 10 }),
      quest({ id: `${lang}-review`, scope: lang, icon: 'review', title: `複習${name}`, detail: `完成 20 次${name}複習`, progress: mine.length, target: 20 }),
      quest({ id: `${lang}-accuracy`, scope: lang, icon: 'accuracy', title: `${name}精準記憶`, detail: `答對（良好以上）15 次`, progress: correct, target: 15 }),
    )
  }
  return out
}

/* --------------------------------------------------------------- character */

export interface LanguageProgress {
  lang: StudyLanguage
  xp: number
  level: LevelInfo
  /** Cards in this language that have graduated to long-term review. */
  mastered: number
  total: number
}

export interface CharacterProgress {
  level: LevelInfo
  languages: Record<StudyLanguage, LanguageProgress>
  todayQuests: Quest[]
  /** Accuracy of today's reviews (0–1), or null before the first one. */
  todayAccuracy: number | null
}

export function computeCharacter(
  cards: Flashcard[],
  logs: ReviewLogEntry[],
  now: number,
  dayStartHour: number,
): CharacterProgress {
  const langById = new Map(cards.map((c) => [c.id, cardLanguage(c)]))
  const langOf = (id: string) => langById.get(id)

  const byDay = new Map<string, DayActivity>()
  const day = (ts: number) => {
    const key = studyDayKey(ts, dayStartHour)
    let d = byDay.get(key)
    if (!d) byDay.set(key, (d = { logs: [], created: 0 }))
    return d
  }

  const langXp = { ja: 0, en: 0 }
  let total = 0
  for (const log of logs) {
    const xp = reviewXp(log)
    total += xp
    const lang = langOf(log.cardId)
    if (lang) langXp[lang] += xp
    day(log.reviewedAt).logs.push(log)
  }
  for (const card of cards) {
    total += CARD_CREATED_XP
    day(card.createdAt).created += 1
  }

  const todayKey = studyDayKey(now, dayStartHour)
  let todayQuests: Quest[] = questsForDay({ logs: [], created: 0 }, langOf)
  for (const [key, activity] of byDay) {
    const quests = questsForDay(activity, langOf)
    total += quests.filter((q) => q.done).length * QUEST_XP
    if (key === todayKey) todayQuests = quests
  }

  const language = (lang: StudyLanguage): LanguageProgress => {
    const mine = cards.filter((c) => langOf(c.id) === lang)
    return {
      lang,
      xp: langXp[lang],
      level: levelFromXp(langXp[lang]),
      mastered: mine.filter((c) => c.state === CardState.Review).length,
      total: mine.length,
    }
  }

  const today = byDay.get(todayKey)?.logs ?? []
  return {
    level: levelFromXp(total),
    languages: { ja: language('ja'), en: language('en') },
    todayQuests,
    todayAccuracy: today.length ? today.filter((l) => l.rating !== Rating.Again).length / today.length : null,
  }
}
