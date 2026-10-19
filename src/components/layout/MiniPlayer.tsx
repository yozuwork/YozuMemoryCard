import { AnimatePresence, motion } from 'motion/react'
import { Pause, Play, SkipForward, Square } from 'lucide-react'
import { usePlayer } from '../../store/player'
import { useSettings } from '../../store/settings'

const RATES = [0.75, 1, 1.25, 1.5]

/** Read-aloud controls shown above the tab bar while a list is being played. */
export function MiniPlayer() {
  const { queue, index, playing, currentText, toggle, next, stop } = usePlayer()
  const rate = useSettings((s) => s.speechRate)
  const setSettings = useSettings((s) => s.set)
  const active = queue.length > 0

  const cycleRate = () => {
    const i = RATES.findIndex((r) => r >= rate - 0.01)
    setSettings({ speechRate: RATES[(i + 1) % RATES.length] })
  }

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          className="tabbar fixed inset-x-0 z-30 flex justify-center px-4 bottom-[calc(max(var(--safe-bottom),12px)+var(--tabbar-h)+10px)] lg:bottom-6 lg:left-[248px]"
          role="region"
          aria-label="朗讀播放器"
        >
          <div className="glass flex w-full max-w-[460px] items-center gap-1 rounded-[20px] py-1.5 pl-4 pr-1.5 shadow-float">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-ink">{currentText || '準備朗讀…'}</p>
              <p className="text-[12px] tabular-nums text-ink-2">
                {Math.min(index + 1, queue.length)} / {queue.length}
              </p>
            </div>
            <button
              type="button"
              onClick={cycleRate}
              className="min-h-11 rounded-full px-2.5 text-[15px] tabular-nums text-ink-2"
              aria-label={`語速 ${rate.toFixed(2)} 倍，點擊切換`}
            >
              {rate.toFixed(rate % 1 === 0 ? 1 : 2).replace(/0$/, '')}x
            </button>
            <button type="button" onClick={toggle} aria-label={playing ? '暫停' : '播放'} className="flex size-11 items-center justify-center rounded-full text-ink active:bg-fill">
              {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </button>
            <button type="button" onClick={stop} aria-label="停止" className="flex size-11 items-center justify-center rounded-full text-ink active:bg-fill">
              <Square size={18} fill="currentColor" />
            </button>
            <button type="button" onClick={next} aria-label="下一張" className="flex size-11 items-center justify-center rounded-full text-ink active:bg-fill">
              <SkipForward size={22} fill="currentColor" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
