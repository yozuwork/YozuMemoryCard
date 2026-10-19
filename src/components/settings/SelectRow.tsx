import { useId, type ReactNode } from 'react'
import { ChevronsUpDown } from 'lucide-react'

interface SelectRowProps<T extends string | number> {
  label: string
  icon?: ReactNode
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

/**
 * Settings row backed by a native <select>, so phones show their own picker
 * (wheel on iOS) and keyboard / screen-reader support comes for free.
 */
export function SelectRow<T extends string | number>({ label, icon, value, options, onChange }: SelectRowProps<T>) {
  const id = useId()
  const current = options.find((o) => o.value === value)
  return (
    <div className="list-row relative flex w-full items-center gap-3 pl-4 transition-colors focus-within:bg-fill-2 hover:bg-fill-2/60">
      {icon && <span className="flex size-[30px] shrink-0 items-center justify-center">{icon}</span>}
      <span className="list-row-body flex min-h-[52px] min-w-0 flex-1 items-center gap-2 py-2.5 pr-4">
        <label htmlFor={id} className="flex-1 text-[16px] text-ink">
          {label}
        </label>
        <span className="truncate text-[16px] text-tint">{current?.label}</span>
        <ChevronsUpDown size={15} className="shrink-0 text-tint" aria-hidden />
      </span>
      <select
        id={id}
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value
          const match = options.find((o) => String(o.value) === raw)
          if (match) onChange(match.value)
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
