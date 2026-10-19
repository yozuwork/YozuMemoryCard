import { useEffect, useState, useSyncExternalStore } from 'react'
import { useSettings } from '../store/settings'

/** Current time, re-rendered every `intervalMs` so due counts stay fresh. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])
  return now
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')

/** Applies the theme setting to <html> and the browser chrome colour. */
export function useApplyTheme() {
  const theme = useSettings((s) => s.theme)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const dark = theme === 'dark' || (theme === 'system' && systemDark)
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    root.style.colorScheme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#ffffff')
  }, [dark])
}

const isTextEntry = (el: Element | null) =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLInputElement && !['checkbox', 'radio', 'range', 'button', 'submit', 'file'].includes(el.type)) ||
  (el instanceof HTMLElement && el.isContentEditable)

/**
 * On touch devices the on-screen keyboard covers the bottom of the viewport.
 * While a text field is focused we flag <html> so the floating tab bar hides,
 * and keep the focused field in view once the keyboard has opened.
 */
export function useKeyboardAwareness() {
  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)')
    const onFocusIn = (e: FocusEvent) => {
      if (!coarse.matches || !isTextEntry(e.target as Element)) return
      document.documentElement.classList.add('keyboard-open')
      const el = e.target as HTMLElement
      setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320)
    }
    const onFocusOut = () => {
      setTimeout(() => {
        if (!isTextEntry(document.activeElement)) document.documentElement.classList.remove('keyboard-open')
      }, 50)
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])
}

/**
 * Daily study reminder via the Notifications API. Without a push server this can
 * only fire while the app is open (foreground or background tab) — the settings
 * screen says so explicitly.
 */
export function useStudyReminder() {
  const enabled = useSettings((s) => s.reminderEnabled)
  const time = useSettings((s) => s.reminderTime)
  useEffect(() => {
    if (!enabled || !('Notification' in window)) return
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const [h, m] = time.split(':').map(Number)
      const next = new Date()
      next.setHours(h, m, 0, 0)
      if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1)
      timer = setTimeout(async () => {
        if (Notification.permission === 'granted') {
          const body = '該複習今天的卡片囉！'
          const reg = await navigator.serviceWorker?.getRegistration()
          if (reg) await reg.showNotification('YoZu 記憶卡', { body, icon: '/pwa-192.png', tag: 'daily-reminder' })
          else new Notification('YoZu 記憶卡', { body, icon: '/pwa-192.png' })
        }
        schedule()
      }, next.getTime() - Date.now())
    }
    schedule()
    return () => clearTimeout(timer)
  }, [enabled, time])
}
