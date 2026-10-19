const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export interface DayBounds {
  start: number
  end: number
}

/**
 * The study day starts at `dayStartHour` local time, so a review at 01:00
 * with a 04:00 day start still counts towards the previous day.
 */
export function studyDayBounds(now: number, dayStartHour: number): DayBounds {
  const d = new Date(now)
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), dayStartHour, 0, 0, 0)
  if (d.getTime() < start.getTime()) start.setDate(start.getDate() - 1)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.getTime(), end: end.getTime() }
}

export function studyDayKey(ts: number, dayStartHour: number): string {
  const { start } = studyDayBounds(ts, dayStartHour)
  const d = new Date(start)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Short interval label used under rating buttons, e.g. "10 分鐘", "3 天". */
export function formatInterval(ms: number): string {
  if (ms < MINUTE) return '< 1 分鐘'
  if (ms < HOUR) return `${Math.round(ms / MINUTE)} 分鐘`
  if (ms < DAY) return `${Math.round(ms / HOUR)} 小時`
  const days = ms / DAY
  if (days < 30) return `${Math.round(days)} 天`
  if (days < 365) return `${Math.round(days / 30)} 個月`
  const years = days / 365
  return `${years < 10 ? years.toFixed(1).replace(/\.0$/, '') : Math.round(years)} 年`
}

/** Relative past date in the style of "今天" / "3 天前" / "2 年前". */
export function formatRelativePast(ts: number, now = Date.now()): string {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today.getTime() - new Date(ts).setHours(0, 0, 0, 0)) / DAY)
  if (diffDays <= 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 週前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 個月前`
  return `${Math.floor(diffDays / 365)} 年前`
}

/** Relative future date, e.g. "5 分鐘後", "明天", "3 天後". */
export function formatRelativeFuture(ts: number, now = Date.now()): string {
  const diff = ts - now
  if (diff <= 0) return '現在'
  if (diff < HOUR) return `${Math.max(1, Math.round(diff / MINUTE))} 分鐘後`
  if (diff < DAY) return `${Math.round(diff / HOUR)} 小時後`
  return `${formatInterval(diff)}後`
}

export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / MINUTE)
  if (minutes < 1) return `${Math.max(0, Math.round(ms / 1000))} 秒`
  if (minutes < 60) return `${minutes} 分鐘`
  return `${Math.floor(minutes / 60)} 小時 ${minutes % 60} 分`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export { MINUTE, HOUR, DAY }
