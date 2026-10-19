import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Check } from 'lucide-react'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  checked?: boolean
  destructive?: boolean
  disabled?: boolean
  /** Draws a divider above this item. */
  separated?: boolean
}

interface MenuProps {
  /** Renders the trigger; spread the given props onto a button. */
  trigger: (props: {
    onClick: () => void
    'aria-expanded': boolean
    'aria-haspopup': 'menu'
    'aria-controls': string
  }) => ReactNode
  items: MenuItem[]
  align?: 'left' | 'right'
  label: string
}

/** Lightweight popover menu with arrow-key navigation. */
export function Menu({ trigger, items, align = 'right', label }: MenuProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>('[role^="menuitem"]:not([disabled])')?.focus())
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function onListKey(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const nodes = [...(listRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])') ?? [])]
    const i = nodes.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'ArrowDown' ? (i + 1) % nodes.length : (i - 1 + nodes.length) % nodes.length
    nodes[next]?.focus()
  }

  return (
    <div ref={rootRef} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu', 'aria-controls': id })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            id={id}
            role="menu"
            aria-label={label}
            onKeyDown={onListKey}
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className={clsx(
              'glass absolute top-full z-40 mt-2 min-w-[232px] overflow-hidden rounded-[18px] py-1.5 shadow-float',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            )}
          >
            {items.map((item, i) => (
              <div key={i}>
                {item.separated && <div className="mx-4 my-1.5 h-px bg-line" />}
                <button
                  type="button"
                  role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
                  aria-checked={item.checked}
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false)
                    item.onSelect()
                  }}
                  className={clsx(
                    'flex min-h-11 w-full items-center gap-3 px-4 text-left text-[16px] outline-none transition-colors hover:bg-fill-2 focus-visible:bg-fill disabled:opacity-40',
                    item.destructive ? 'text-danger' : 'text-ink',
                  )}
                >
                  <span className="flex w-5 shrink-0 justify-center text-tint">
                    {item.checked && <Check size={17} strokeWidth={2.5} />}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.icon && <span className={clsx('shrink-0', item.destructive ? 'text-danger' : 'text-ink-2')}>{item.icon}</span>}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
