import { Check } from 'lucide-react'
import { colorNames, gradientOf, palette, type ColorName } from '../../lib/deckColors'

interface ColorPickerProps {
  value: ColorName
  onChange: (c: ColorName) => void
  label: string
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 px-1 text-[13px] font-medium text-ink-2">{label}</legend>
      <div className="flex flex-wrap gap-3 rounded-[18px] bg-surface p-4" role="radiogroup" aria-label={label}>
        {colorNames.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={palette[c].label}
            onClick={() => onChange(c)}
            className="relative flex size-11 items-center justify-center rounded-full transition-transform active:scale-90"
            style={{ background: gradientOf(c) }}
          >
            {value === c && (
              <>
                <span className="absolute -inset-[4px] rounded-full border-2" style={{ borderColor: palette[c].solid }} aria-hidden />
                <Check size={18} strokeWidth={3} className="text-white" />
              </>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
