import { useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { MiniPlayer } from './MiniPlayer'
import { ConfirmHost, Toaster } from '../ui/Feedback'
import { usesGroupedBackground } from '../../lib/navigation'

export function AppShell() {
  const { pathname } = useLocation()
  const outlet = useOutlet()
  const grouped = usesGroupedBackground(pathname)

  // Keep the overscroll / safe-area areas the same colour as the page.
  useEffect(() => {
    document.body.style.backgroundColor = grouped ? 'var(--c-grouped)' : 'var(--c-canvas)'
  }, [grouped])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className={clsx('min-h-dvh lg:pl-[248px]', grouped ? 'bg-grouped' : 'bg-canvas')}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-tint focus:px-4 focus:py-2 focus:text-white"
      >
        跳到主要內容
      </a>
      <Sidebar />
      <main
        id="main"
        className="mx-auto w-full max-w-[1120px] px-4 pb-tabbar pt-[calc(var(--safe-top)+14px)] sm:px-6 lg:px-10 lg:pb-16 lg:pt-10"
      >
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
        >
          {outlet}
        </motion.div>
      </main>
      <MiniPlayer />
      <BottomNav />
      <Toaster />
      <ConfirmHost />
    </div>
  )
}
