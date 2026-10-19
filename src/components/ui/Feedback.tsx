import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useUi } from '../../store/ui'

/** Stack of transient messages above the tab bar. */
export function Toaster() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismissToast)
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)] lg:bottom-8"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            className="pointer-events-auto flex min-h-12 max-w-[min(420px,100%)] items-center gap-3 rounded-full bg-[#1c1c1e]/92 py-2 pl-4 pr-2 text-[15px] text-white shadow-float backdrop-blur-xl dark:bg-[#3a3a3c]/95"
          >
            {t.tone === 'success' && <CircleCheck size={18} className="shrink-0 text-[#30D158]" />}
            {t.tone === 'error' && <CircleAlert size={18} className="shrink-0 text-[#FF6961]" />}
            <span className={clsx('min-w-0 flex-1', !t.action && 'pr-2')}>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.run()
                  dismiss(t.id)
                }}
                className="min-h-9 shrink-0 rounded-full px-3 text-[15px] font-semibold text-[#64B5FF]"
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

/** Renders the promise-based confirm dialog requested via `confirmDialog()`. */
export function ConfirmHost() {
  const req = useUi((s) => s.confirmRequest)
  const settle = useUi((s) => s.settleConfirm)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!req) return
    const t = setTimeout(() => confirmRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        settle(false)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [req, settle])

  return createPortal(
    <AnimatePresence>
      {req && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-8">
          <motion.div
            className="absolute inset-0 bg-[var(--c-scrim)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => settle(false)}
            aria-hidden
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={req.message ? 'confirm-msg' : undefined}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="glass relative w-full max-w-[300px] overflow-hidden rounded-[22px] text-center shadow-float"
          >
            <div className="px-5 pb-4 pt-5">
              <h2 id="confirm-title" className="text-[17px] font-semibold text-ink">
                {req.title}
              </h2>
              {req.message && (
                <p id="confirm-msg" className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                  {req.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 border-t border-line">
              <button
                type="button"
                onClick={() => settle(false)}
                className="min-h-12 border-r border-line text-[17px] text-tint active:bg-fill-2"
              >
                {req.cancelLabel ?? '取消'}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => settle(true)}
                className={clsx(
                  'min-h-12 text-[17px] font-semibold active:bg-fill-2',
                  req.destructive ? 'text-danger' : 'text-tint',
                )}
              >
                {req.confirmLabel ?? '確定'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
