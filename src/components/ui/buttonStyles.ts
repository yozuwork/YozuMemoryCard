import clsx from 'clsx'

export type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger' | 'plain'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-tint text-white hover:brightness-110 active:brightness-95',
  brand: 'bg-brand text-white shadow-[0_6px_18px_-6px_rgb(183_156_246/0.7)] hover:brightness-105 active:brightness-95',
  secondary: 'bg-fill text-ink hover:bg-fill/80 active:bg-fill/60',
  ghost: 'bg-transparent text-ink-2 hover:bg-fill-2 hover:text-ink active:bg-fill',
  danger: 'bg-danger/10 text-danger hover:bg-danger/15 active:bg-danger/20',
  plain: 'bg-transparent text-tint hover:opacity-70 active:opacity-50',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 text-[14px] rounded-full gap-1.5',
  md: 'min-h-11 px-5 text-[15px] rounded-full gap-2',
  lg: 'min-h-[52px] px-6 text-[17px] rounded-2xl gap-2',
}

/** Button styling, also used for links that look like buttons. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}) {
  return clsx(
    'inline-flex select-none items-center justify-center font-semibold transition-[filter,background-color,opacity,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    className,
  )
}
