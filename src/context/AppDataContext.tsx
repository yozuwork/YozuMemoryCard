import { useEffect, useState, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { db } from '../db/schema'
import { installJapanTravelDecks, removeSampleDataOnce } from '../db/seed'
import { useApplyTheme, useKeyboardAwareness, useStudyReminder } from '../hooks/useEnvironment'
import { LogoMark } from '../components/brand/Logo'

type DbStatus = 'loading' | 'ready' | 'error'

/**
 * Opens IndexedDB (starting empty — sample decks are opt-in from Settings) and wires
 * app-wide effects: theme, keyboard handling and study reminders.
 */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DbStatus>('loading')
  const [error, setError] = useState<string>()

  useApplyTheme()
  useKeyboardAwareness()
  useStudyReminder()

  useEffect(() => {
    db.open()
      .then(removeSampleDataOnce)
      .then(installJapanTravelDecks)
      .then(() => setStatus('ready'))
      .catch((e: unknown) => {
        console.error(e)
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      })
  }, [])

  if (status === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
        <LogoMark size={56} className="rounded-2xl shadow-card" />
        <p className="text-[17px] font-semibold text-ink">無法開啟本機資料庫</p>
        <p className="max-w-sm text-[15px] text-ink-2">
          瀏覽器可能處於私密模式或已封鎖網站資料儲存，請允許儲存後重新整理。
        </p>
        {error && <code className="mt-2 rounded-lg bg-fill px-2 py-1 text-[12px] text-ink-2">{error}</code>}
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="載入中">
        <LogoMark size={56} className="animate-pulse rounded-2xl shadow-card" />
      </div>
    )
  }

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
