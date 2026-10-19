import { useId, type ReactNode } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Minus, Plus } from 'lucide-react'

/* ----------------------------------------------------------------- Switch */

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-200 disabled:opacity-40',
        checked ? 'bg-success' : 'bg-fill',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 40 }}
        className={clsx('block size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.1)]', checked && 'ml-auto')}
      />
    </button>
  )
}

/* ------------------------------------------------------------- Segmented */

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
  className?: string
}

export function Segmented<T extends string>({ value, onChange, options, label, className }: SegmentedProps<T>) {
  const id = useId()
  return (
    <div role="radiogroup" aria-label={label} className={clsx('flex rounded-[10px] bg-fill p-[2px]', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className="relative min-h-9 flex-1 rounded-[8px] px-3 text-[14px] font-semibold"
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-[8px] bg-surface shadow-[0_3px_8px_rgb(0_0_0/0.08),0_0_0_0.5px_rgb(0_0_0/0.04)] dark:bg-[#636366]"
              />
            )}
            <span className={clsx('relative', active ? 'text-ink' : 'text-ink-2')}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- Stepper */

interface StepperProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label: string
  format?: (v: number) => string
}

export function Stepper({ value, onChange, min, max, step = 1, label, format }: StepperProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="min-w-12 text-right text-[16px] tabular-nums text-ink-2" aria-live="polite">
        {format ? format(value) : value}
      </span>
      <div className="flex h-8 items-center rounded-[9px] bg-fill">
        <button
          type="button"
          aria-label={`減少${label}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
          className="flex h-8 w-11 items-center justify-center text-ink disabled:opacity-30"
        >
          <Minus size={16} strokeWidth={2.5} />
        </button>
        <span className="h-4 w-px bg-ink-3/60" aria-hidden />
        <button
          type="button"
          aria-label={`增加${label}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
          className="flex h-8 w-11 items-center justify-center text-ink disabled:opacity-30"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Slider */

interface SliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  label: string
  valueText?: string
}

export function Slider({ value, onChange, min, max, step, label, valueText }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      aria-valuetext={valueText}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ['--pct' as string]: `${pct}%` }}
      className={clsx(
        'h-11 w-full cursor-pointer appearance-none bg-transparent',
        '[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full',
        '[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--c-tint)_var(--pct),var(--c-fill)_var(--pct))]',
        '[&::-webkit-slider-thumb]:-mt-[12px] [&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_3px_8px_rgb(0_0_0/0.15),0_0_0_0.5px_rgb(0_0_0/0.06)]',
        '[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-fill',
        '[&::-moz-range-progress]:h-1 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-tint',
        '[&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_3px_8px_rgb(0_0_0/0.15)]',
      )}
    />
  )
}

/* -------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton rounded-xl', className)} aria-hidden />
}
