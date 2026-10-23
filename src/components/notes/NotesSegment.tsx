import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Segmented } from '../ui/Controls'
import { languageFilterLabels, type LanguageFilter } from '../../lib/cardLanguage'
import { useNotesLanguage } from '../../store/notesLanguage'

const languages = Object.keys(languageFilterLabels) as LanguageFilter[]

/** Switches the 筆記 tab between the card list and the deck overview, and filters both by language. */
export function NotesSegment({ value }: { value: 'notes' | 'decks' }) {
  const navigate = useNavigate()
  const language = useNotesLanguage((s) => s.language)
  const setLanguage = useNotesLanguage((s) => s.setLanguage)
  return (
    <>
      <Segmented
        label="檢視方式"
        value={value}
        onChange={(v) => navigate(v === 'notes' ? '/notes' : '/decks', { replace: true })}
        options={[
          { value: 'notes', label: '全部筆記' },
          { value: 'decks', label: '牌組' },
        ]}
        className="mb-3 max-w-[340px]"
      />
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
    </>
  )
}
