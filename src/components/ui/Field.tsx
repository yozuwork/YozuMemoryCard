import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import clsx from 'clsx'
import { Search, X } from 'lucide-react'

interface FieldWrapperProps {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: ReactNode
}

export function FieldWrapper({ label, htmlFor, hint, error, children }: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block px-1 text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 px-1 text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 px-1 text-[13px] text-ink-2">{hint}</p>
      )}
    </div>
  )
}

const inputBase =
  'w-full rounded-field bg-fill-2 px-4 py-3 text-[16px] text-ink placeholder:text-ink-2/70 outline-none transition-shadow focus:bg-surface focus:shadow-[0_0_0_2px_var(--c-tint)]'

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={clsx(inputBase, className)} {...rest} />
})

interface AutoTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number
  /** Bare variant: no background, used inside the editor's white blocks. */
  bare?: boolean
}

/** Textarea that grows with its content. 16px text avoids iOS zoom-on-focus. */
export const TextArea = forwardRef<HTMLTextAreaElement, AutoTextAreaProps>(function TextArea(
  { className, minRows = 2, bare, value, ...rest },
  ref,
) {
  const inner = useRef<HTMLTextAreaElement>(null)
  useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement)
  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={inner}
      rows={minRows}
      value={value}
      className={clsx(
        bare
          ? 'w-full resize-none bg-transparent text-[17px] leading-relaxed text-ink outline-none placeholder:text-ink-2/70'
          : clsx(inputBase, 'resize-none leading-relaxed'),
        className,
      )}
      {...rest}
    />
  )
})

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
}

export function SearchField({ value, onChange, className, placeholder = '搜尋', ...rest }: SearchFieldProps) {
  return (
    <div className={clsx('relative', className)}>
      <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2" aria-hidden />
      <input
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-full bg-fill pl-10 pr-10 text-[16px] text-ink outline-none transition-shadow placeholder:text-ink-2 focus:shadow-[0_0_0_2px_var(--c-tint)] [&::-webkit-search-cancel-button]:hidden"
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="清除搜尋"
          className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-2"
        >
          <span className="flex size-[18px] items-center justify-center rounded-full bg-ink-3 text-surface">
            <X size={12} strokeWidth={3} />
          </span>
        </button>
      )}
    </div>
  )
}
