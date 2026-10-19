import { forwardRef, type ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Circular icon-only button; requires aria-label. */
  round?: boolean
  active?: boolean
}

/** Translucent pill used in page top bars ("編輯", "+", "…"). */
export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(function GlassButton(
  { round, active, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'glass inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full text-[16px] font-medium text-ink shadow-[0_2px_10px_rgb(0_0_0/0.06)] transition-[transform,background-color] duration-150 active:scale-95 disabled:opacity-40',
        round ? 'size-11' : 'px-4.5',
        active && '!bg-tint !text-white',
        className,
      )}
      {...rest}
    />
  )
})
