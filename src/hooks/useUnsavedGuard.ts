import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import { confirmDialog } from '../store/ui'

/**
 * Asks before leaving a page with unsaved edits — for in-app navigation (tab bar,
 * back button) and for reloads / closing the tab. Call `allowNext()` right
 * before an intentional navigation such as after saving.
 */
export function useUnsavedGuard(dirty: boolean) {
  const allow = useRef(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allow.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    let active = true
    void confirmDialog({
      title: '要捨棄未儲存的變更嗎？',
      message: '離開後，這張卡片的編輯內容將不會保留。',
      confirmLabel: '捨棄',
      cancelLabel: '繼續編輯',
      destructive: true,
    }).then((ok) => {
      if (!active) return
      if (ok) blocker.proceed()
      else blocker.reset()
    })
    return () => {
      active = false
    }
  }, [blocker])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  return {
    /** Lets the page leave without asking; stays in effect until unmount. */
    allowNext: () => {
      allow.current = true
    },
  }
}
