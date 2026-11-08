import type { PackDeck } from '../japanTravelDecks'
import { osakaDecks01to03 } from './decks01to03'
import { osakaDecks04to06 } from './decks04to06'
import { osakaDecks07to09 } from './decks07to09'
import { osakaDecks10to12 } from './decks10to12'
import { osakaDecks13to15 } from './decks13to15'
import { osakaDecks16to18 } from './decks16to18'

export { osakaTags } from './shared'

/** 大阪 01–18, in order. */
export const osakaDecks: PackDeck[] = [
  ...osakaDecks01to03,
  ...osakaDecks04to06,
  ...osakaDecks07to09,
  ...osakaDecks10to12,
  ...osakaDecks13to15,
  ...osakaDecks16to18,
]
