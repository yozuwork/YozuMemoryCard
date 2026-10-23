import transit from '../assets/covers/transit.svg'
import izakaya from '../assets/covers/izakaya.svg'
import restaurant from '../assets/covers/restaurant.svg'
import type { Deck } from '../types/deck'

/** Illustrated default covers for the built-in packs, by pack key. */
const packCovers: Record<string, string> = {
  'japan-travel-01': transit,
  'japan-travel-02': izakaya,
  'japan-travel-03': restaurant,
}

export function packCoverOf(deck: Pick<Deck, 'packKey'>): string | undefined {
  return deck.packKey ? packCovers[deck.packKey] : undefined
}

/** The character shown on a generated cover: the first letter of the name, skipping a "01｜" style prefix. */
export function coverGlyph(name: string): string {
  const title = name.includes('｜') ? name.slice(name.indexOf('｜') + 1) : name
  return [...title.trim()][0]?.toUpperCase() ?? ''
}
