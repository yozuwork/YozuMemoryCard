import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Trophy } from 'lucide-react'
import { useCharacterProgress } from '../../hooks/useCharacterProgress'
import { useCharacter } from '../../store/character'
import { QUEST_XP, titleForLevel, type Quest } from '../../lib/character'
import { CharacterPortrait, Sparkle } from './CharacterAvatar'

interface XpPop {
  id: number
  amount: number
}

let nextId = 1

/**
 * Watches the character's progress app-wide and turns gains into feedback:
 * a floating "+EXP" chip, a banner for each completed quest, and a full-screen
 * celebration on level-up. Losses (undo, reset) are silent.
 */
export function ProgressFeedback() {
  const progress = useCharacterProgress()
  const seenLevel = useCharacter((s) => s.seenLevel)
  const setSeenLevel = useCharacter((s) => s.setSeenLevel)

  const prev = useRef<{ total: number; done: Set<string> } | null>(null)
  const [pops, setPops] = useState<XpPop[]>([])
  const [quests, setQuests] = useState<(Quest & { key: number })[]>([])

  useEffect(() => {
    if (!progress) return
    const total = progress.level.total
    const done = new Set(progress.todayQuests.filter((q) => q.done).map((q) => q.id))
    const before = prev.current
    prev.current = { total, done }

    // First reading: remember where we are without celebrating old progress.
    if (!before) {
      if (seenLevel === 0 || progress.level.level < seenLevel) setSeenLevel(progress.level.level)
      return
    }
    if (progress.level.level < seenLevel) setSeenLevel(progress.level.level)

    const fresh = progress.todayQuests.filter((q) => q.done && !before.done.has(q.id))
    const gained = total - before.total - fresh.length * QUEST_XP
    if (gained > 0) {
      const pop = { id: nextId++, amount: gained }
      setPops((p) => [...p, pop])
      setTimeout(() => setPops((p) => p.filter((x) => x.id !== pop.id)), 1400)
    }
    for (const q of fresh) {
      const item = { ...q, key: nextId++ }
      setQuests((list) => [...list, item])
      setTimeout(() => setQuests((list) => list.filter((x) => x.key !== item.key)), 3200)
    }
  }, [progress, seenLevel, setSeenLevel])

  const levelUp = progress && seenLevel > 0 && progress.level.level > seenLevel ? progress.level.level : null

  return createPortal(
    <>
      {/* +EXP chips */}
      <div className="pointer-events-none fixed inset-x-0 z-[65] flex justify-center bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+150px)] lg:bottom-40" aria-hidden>
        <AnimatePresence>
          {pops.map((p) => (
            <motion.span
              key={p.id}
              initial={{ opacity: 0, y: 12, scale: 0.7 }}
              animate={{ opacity: 1, y: -28, scale: 1 }}
              exit={{ opacity: 0, y: -60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              className="absolute flex items-center gap-1 rounded-full bg-[#120e1f]/90 px-3.5 py-1.5 text-[15px] font-extrabold tabular-nums text-white shadow-float backdrop-blur"
            >
              <Sparkle className="size-3.5 text-[#f5a0c6]" />
              <span className="bg-[linear-gradient(90deg,#f5a0c6,#b79cf6)] bg-clip-text text-transparent">+{p.amount} EXP</span>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* quest complete banners */}
      <div
        className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+12px)] z-[66] flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {quests.map((q) => (
            <motion.div
              key={q.key}
              layout
              initial={{ opacity: 0, y: -30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="flex w-full max-w-[380px] items-center gap-3 rounded-[20px] bg-[#16112a] p-3 pr-4 ring-1 ring-white/10 text-white shadow-float backdrop-blur-xl"
            >
              <motion.span
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f5a0c6,#b79cf6)]"
                initial={{ rotate: -20, scale: 0.6 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.1 }}
              >
                <Trophy size={21} />
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold tracking-[0.14em] text-[#f5a0c6]">任務完成</p>
                <p className="truncate text-[15px] font-semibold">{q.title}</p>
              </div>
              <span className="text-[15px] font-extrabold tabular-nums text-[#b79cf6]">+{QUEST_XP}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {levelUp && <LevelUpOverlay key={levelUp} level={levelUp} onClose={() => setSeenLevel(levelUp)} />}
      </AnimatePresence>
    </>,
    document.body,
  )
}

const burst = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const dist = 110 + (i % 3) * 30
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size: 8 + (i % 4) * 4, color: i % 2 ? '#f5a0c6' : '#b79cf6' }
})

function LevelUpOverlay({ level, onClose }: { level: number; onClose: () => void }) {
  const title = titleForLevel(level)
  const newTitle = titleForLevel(level - 1) !== title

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
    >
      <motion.div
        className="relative flex w-full max-w-[340px] flex-col items-center text-center text-white"
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex size-48 items-center justify-center">
          <motion.div
            className="absolute inset-[-40%] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgb(245_160_198/0.45)_20deg,transparent_40deg,transparent_90deg,rgb(183_156_246/0.45)_110deg,transparent_130deg,transparent_180deg,rgb(245_160_198/0.45)_200deg,transparent_220deg,transparent_270deg,rgb(183_156_246/0.45)_290deg,transparent_310deg)] [mask-image:radial-gradient(closest-side,black,transparent)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            aria-hidden
          />
          {burst.map((b, i) => (
            <motion.span
              key={i}
              className="absolute"
              style={{ width: b.size, height: b.size, color: b.color }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{ x: b.x, y: b.y, opacity: 0, scale: 1, rotate: 90 }}
              transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 }}
              aria-hidden
            >
              <Sparkle className="size-full" />
            </motion.span>
          ))}
          <CharacterPortrait className="relative size-36 ring-4 ring-white/80 shadow-[0_0_60px_rgb(183_156_246/0.8)]" />
        </div>

        <motion.p
          className="mt-6 text-[13px] font-bold tracking-[0.4em] text-[#f5a0c6]"
          initial={{ opacity: 0, letterSpacing: '0.1em' }}
          animate={{ opacity: 1, letterSpacing: '0.4em' }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          LEVEL UP
        </motion.p>
        <motion.h2
          id="levelup-title"
          className="mt-1 text-[56px] font-black leading-none tracking-tight"
          initial={{ scale: 2.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.3 }}
        >
          Lv. {level}
        </motion.h2>
        <motion.p
          className="mt-3 text-[16px] text-white/75"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          {newTitle ? (
            <>
              獲得新稱號 <span className="font-bold text-white">「{title}」</span>
            </>
          ) : (
            '繼續累積，下一個稱號就在前方'
          )}
        </motion.p>
        <motion.button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-8 min-h-[52px] w-full rounded-full bg-white text-[17px] font-bold text-[#120e1f] transition-transform active:scale-[0.97]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          繼續冒險
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
