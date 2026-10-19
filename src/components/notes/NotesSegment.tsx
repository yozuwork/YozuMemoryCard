import { useNavigate } from 'react-router-dom'
import { Segmented } from '../ui/Controls'

/** Switches the 筆記 tab between the card list and the deck overview. */
export function NotesSegment({ value }: { value: 'notes' | 'decks' }) {
  const navigate = useNavigate()
  return (
    <Segmented
      label="檢視方式"
      value={value}
      onChange={(v) => navigate(v === 'notes' ? '/notes' : '/decks', { replace: true })}
      options={[
        { value: 'notes', label: '全部筆記' },
        { value: 'decks', label: '牌組' },
      ]}
      className="mb-4 max-w-[340px]"
    />
  )
}
