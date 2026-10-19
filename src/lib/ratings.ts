import { CardState, Rating } from '../types/card'

export interface RatingMeta {
  key: Rating
  label: string
  shortcut: string
  /** Tailwind classes; literal strings so the JIT scanner picks them up. */
  className: string
}

export const ratingMeta: RatingMeta[] = [
  {
    key: Rating.Again,
    label: '重來',
    shortcut: '1',
    className: 'bg-[#FF3B30]/10 text-[#E5352B] hover:bg-[#FF3B30]/15 dark:bg-[#FF453A]/15 dark:text-[#FF6961]',
  },
  {
    key: Rating.Hard,
    label: '困難',
    shortcut: '2',
    className: 'bg-[#FF9500]/12 text-[#D27A00] hover:bg-[#FF9500]/18 dark:bg-[#FF9F0A]/15 dark:text-[#FFB340]',
  },
  {
    key: Rating.Good,
    label: '普通',
    shortcut: '3',
    className: 'bg-[#34C759]/12 text-[#248A3D] hover:bg-[#34C759]/18 dark:bg-[#30D158]/15 dark:text-[#4ADE80]',
  },
  {
    key: Rating.Easy,
    label: '簡單',
    shortcut: '4',
    className: 'bg-[#007AFF]/10 text-[#0066D6] hover:bg-[#007AFF]/15 dark:bg-[#0A84FF]/15 dark:text-[#5EA8FF]',
  },
]

export const stateLabel: Record<CardState, string> = {
  [CardState.New]: '新卡片',
  [CardState.Learning]: '學習中',
  [CardState.Review]: '複習',
  [CardState.Relearning]: '重新學習',
}
