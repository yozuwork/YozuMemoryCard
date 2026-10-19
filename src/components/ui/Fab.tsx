import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

/** Floating gradient action button that sits above the tab bar on phones. */
export function Fab({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={clsx(
        'tabbar fixed right-5 z-30 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_28px_-8px_rgb(183_156_246/0.9)] transition-transform active:scale-95 lg:hidden',
        'bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+22px)]',
        className,
      )}
      {...rest}
    />
  )
}
