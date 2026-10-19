import { ChartColumn, Clock3, List, Settings, SquarePen, Tag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Path prefixes that keep this tab highlighted. */
  match: string[]
}

export const navItems: NavItem[] = [
  { to: '/review', label: '複習', icon: Clock3, match: ['/review', '/stats'] },
  { to: '/record', label: '記錄', icon: SquarePen, match: ['/record'] },
  { to: '/notes', label: '筆記', icon: List, match: ['/notes', '/decks'] },
  { to: '/tags', label: '標籤', icon: Tag, match: ['/tags'] },
  { to: '/settings', label: '選項', icon: Settings, match: ['/settings'] },
]

/** Extra destination only shown in the desktop sidebar (phones reach it from 複習). */
export const statsNavItem: NavItem = { to: '/stats', label: '統計', icon: ChartColumn, match: ['/stats'] }

export function isActive(item: NavItem, pathname: string): boolean {
  return item.match.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Routes that sit on the grey "grouped" background instead of plain white. */
export function usesGroupedBackground(pathname: string): boolean {
  return ['/notes', '/decks', '/settings', '/stats'].some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
