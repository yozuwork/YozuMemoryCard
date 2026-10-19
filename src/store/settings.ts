import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_LANGUAGE_ORDER } from '../lib/speech'
import type { Settings } from '../types/settings'

export const DEFAULT_SETTINGS: Settings = {
  speechRate: 1,
  languageOrder: DEFAULT_LANGUAGE_ORDER,
  autoSpeakFront: false,
  autoSpeakBack: false,
  studyOrder: 'review-first',
  newPerDay: 20,
  reviewsPerDay: 200,
  dayStartHour: 4,
  retention: 0.9,
  reminderEnabled: false,
  reminderTime: '20:00',
  theme: 'system',
}

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void
  reset: () => void
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'yozuanki-settings',
      version: 1,
      partialize: ({ set: _set, reset: _reset, ...rest }) => rest,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Settings>
        // Keep languages added in later versions available at the end of the list.
        const order = saved.languageOrder ?? DEFAULT_LANGUAGE_ORDER
        const languageOrder = [...order, ...DEFAULT_LANGUAGE_ORDER.filter((c) => !order.includes(c))]
        return { ...current, ...saved, languageOrder }
      },
    },
  ),
)

export function getSettings(): Settings {
  const { set: _set, reset: _reset, ...rest } = useSettings.getState()
  return rest
}
