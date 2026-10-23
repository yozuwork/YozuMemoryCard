import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { useCards } from './useData'
import { useNow } from './useEnvironment'
import { useSettings } from '../store/settings'
import { computeCharacter } from '../lib/character'
import { computeStreak, dailyStats } from '../lib/deckStats'

/** Live character level, language levels, today's quests and streak. */
export function useCharacterProgress() {
  const cards = useCards()
  const logs = useLiveQuery(() => db.reviews.toArray(), [])
  const now = useNow(60_000)
  const dayStartHour = useSettings((s) => s.dayStartHour)

  return useMemo(() => {
    if (!cards || !logs) return undefined
    return {
      ...computeCharacter(cards, logs, now, dayStartHour),
      streak: computeStreak(dailyStats(logs, 120, now, dayStartHour)),
    }
  }, [cards, logs, now, dayStartHour])
}
