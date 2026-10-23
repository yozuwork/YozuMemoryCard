import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LanguageFilter } from '../lib/cardLanguage'

/** Language filter shared by the 全部筆記 and 牌組 views; remembered across visits. */
export const useNotesLanguage = create<{ language: LanguageFilter; setLanguage: (l: LanguageFilter) => void }>()(
  persist((set) => ({ language: 'all', setLanguage: (language) => set({ language }) }), {
    name: 'yozuanki-notes-language',
    partialize: ({ language }) => ({ language }),
  }),
)
