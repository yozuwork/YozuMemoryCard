import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import clsx from 'clsx'
import { useMediaQuery } from '../../hooks/useEnvironment'
import { useUi } from '../../store/ui'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Rendered at the top-left / top-right of the header (e.g. 取消 / 完成). */
  leading?: ReactNode
  trailing?: ReactNode
  className?: string
}

/**
 * Bottom sheet on phones (drag the grabber down to dismiss), centred dialog on
 * wider screens. Traps Escape, locks page scroll and restores focus on close.
 */
export function Modal({ open, onClose, title, children, leading, trailing, className }: ModalProps) {
  const wide = useMediaQuery('(min-width: 640px)')
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const drag = useDragControls()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const focusTimer = setTimeout(() => {
      const panel = panelRef.current
      const auto = panel?.querySelector<HTMLElement>('[autofocus],[data-autofocus]')
      ;(auto ?? panel)?.focus()
    }, 60)
    const onKey = (e: KeyboardEvent) => {
      // A confirm dialog stacked on top handles its own keys.
      if (useUi.getState().confirmRequest) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
        )
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      clearTimeout(focusTimer)
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey, true)
      previous?.focus?.()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[var(--c-scrim)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={clsx(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-grouped outline-none sm:max-w-[460px] sm:rounded-[28px] sm:shadow-float',
              'rounded-t-[28px] pb-[var(--safe-bottom)] sm:pb-0',
              className,
            )}
            initial={wide ? { opacity: 0, scale: 0.96 } : { y: '100%' }}
            animate={wide ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={wide ? { opacity: 0, scale: 0.97 } : { y: '100%' }}
            transition={wide ? { duration: 0.18 } : { type: 'spring', damping: 34, stiffness: 380 }}
            drag={wide ? false : 'y'}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 650) onClose()
            }}
          >
            <div
              className="shrink-0 touch-none select-none px-4 pt-2 sm:pt-4"
              onPointerDown={(e) => !wide && drag.start(e)}
            >
              <div className="mx-auto mb-2 h-[5px] w-9 rounded-full bg-ink-3/70 sm:hidden" aria-hidden />
              <div className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="justify-self-start">{leading}</div>
                <h2 id={titleId} className="text-center text-[17px] font-semibold text-ink">
                  {title}
                </h2>
                <div className="justify-self-end">{trailing}</div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-3">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
