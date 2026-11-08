import clsx from 'clsx'
import { languageFilterLabels, type LanguageFilter } from '../../lib/cardLanguage'
import { useNotesLanguage } from '../../store/notesLanguage'

const languages = Object.keys(languageFilterLabels) as LanguageFilter[]

/** Language filter chips shared by the 筆記 and 牌組 tabs. */
export function NotesSegment() {
  const language = useNotesLanguage((s) => s.language)
  const setLanguage = useNotesLanguage((s) => s.setLanguage)
  return (
    <div role="radiogroup" aria-label="語言" className="mb-4 flex gap-2">
      {languages.map((l) => {
        const active = l === language
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLanguage(l)}
            className={clsx(
              'min-h-9 rounded-full px-4 text-[14px] font-semibold transition-colors',
              active ? 'bg-ink text-surface' : 'bg-fill text-ink-2',
            )}
          >
            {languageFilterLabels[l]}
          </button>
        )
      })}
    </div>
  )
}
