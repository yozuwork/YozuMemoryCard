import type { ColorName } from '../../lib/deckColors'
import type { SeedCard } from '../mockData'

// Built-in 大阪旅行 series. Each vocabulary card follows the app's Japanese format:
//   front:       漢字 or usual spelling        乗り換え
//   back:        reading — 繁中意思              のりかえ — 轉乘、換車
//   extra:       日文例句（繁中翻譯）            次の駅で乗り換えてください。（請在下一站轉乘。）
//   exampleKana: 例句的分詞假名                  つぎ の えき で のりかえて ください。
// Bump a deck's `version` after editing it so existing installs pick up the change.

export const OSAKA_SERIES_TAG = '大阪旅行'

export type OsakaCategory = '交通' | '餐飲' | '購物' | '住宿' | '觀光' | '應變'

export const osakaTags: { name: string; color: ColorName }[] = [
  { name: OSAKA_SERIES_TAG, color: 'coral' },
  { name: '交通', color: 'blue' },
  { name: '餐飲', color: 'amber' },
  { name: '購物', color: 'rose' },
  { name: '住宿', color: 'lilac' },
  { name: '觀光', color: 'green' },
  { name: '應變', color: 'slate' },
]

export interface OsakaCard {
  front: string
  back: string
  extra: string
  exampleKana: string
}

/** Tags every card with the series and its category. */
export const osakaCards = (category: OsakaCategory, cards: OsakaCard[]): SeedCard[] =>
  cards.map((c) => ({ ...c, tags: [OSAKA_SERIES_TAG, category] }))
