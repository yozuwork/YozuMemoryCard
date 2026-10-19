export interface DailyStudyStat {
  /** Study-day key, YYYY-MM-DD. */
  date: string
  reviews: number
  newCards: number
  timeMinutes: number
  /** Share of reviews not rated "again", 0–1; null when there were no reviews. */
  retentionRate: number | null
}

export interface BackupSnapshot {
  id: string
  createdAt: number
  label: string
  size: number
  cardCount: number
  data: Blob
}
