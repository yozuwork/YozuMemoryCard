import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { BookOpen, Check, Crosshair, Flame, PenLine, RefreshCw, Timer } from 'lucide-react'
import { QUEST_XP, type Quest } from '../../lib/character'

const icons: Record<Quest['icon'], { Icon: typeof BookOpen; color: string }> = {
  learn: { Icon: BookOpen, color: '#f5a0c6' },
  review: { Icon: RefreshCw, color: '#5ac8fa' },
  accuracy: { Icon: Crosshair, color: '#b79cf6' },
  create: { Icon: PenLine, color: '#ffcc4d' },
  checkin: { Icon: Flame, color: '#ff8a5c' },
  focus: { Icon: Timer, color: '#34c759' },
}

const scopeBadge: Record<Quest['scope'], string | null> = { common: null, ja: '日', en: 'EN' }

export function QuestList({ quests }: { quests: Quest[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      <AnimatePresence initial={false} mode="popLayout">
        {quests.map((q, i) => {
          const { Icon, color } = icons[q.icon]
          const pct = (q.progress / q.target) * 100
          return (
            <motion.li
              key={q.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
              exit={{ opacity: 0, scale: 0.97 }}
              className={clsx(
                'relative flex items-center gap-3.5 overflow-hidden rounded-[20px] p-3.5 pr-4 transition-colors',
                q.done ? 'bg-[color-mix(in_srgb,var(--brand-to)_14%,var(--c-surface))]' : 'bg-surface shadow-card',
              )}
            >
              <span
                className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
                aria-hidden
              >
                <Icon size={22} strokeWidth={2.2} />
                {scopeBadge[q.scope] && (
                  <span className="absolute -bottom-1 -right-1 rounded-md bg-ink px-1 text-[10px] font-bold leading-4 text-surface">
                    {scopeBadge[q.scope]}
                  </span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={clsx('truncate text-[16px] font-semibold', q.done ? 'text-ink-2' : 'text-ink')}>{q.title}</p>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-2">
                    {q.progress} / {q.target}
                  </span>
                </div>
                <p className="truncate text-[13px] text-ink-2">{q.detail}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill" aria-hidden>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: q.done ? 'linear-gradient(90deg,var(--brand-from),var(--brand-to))' : color }}
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                  />
                </div>
              </div>

              <div className="flex w-11 shrink-0 flex-col items-center gap-1">
                <motion.span
                  className={clsx(
                    'flex size-8 items-center justify-center rounded-[10px] border-2',
                    q.done ? 'border-transparent bg-brand text-white' : 'border-ink-3',
                  )}
                  initial={false}
                  animate={q.done ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                  role="img"
                  aria-label={q.done ? '已完成' : '未完成'}
                >
                  {q.done && <Check size={18} strokeWidth={3} />}
                </motion.span>
                <span className={clsx('text-[11px] font-bold tabular-nums', q.done ? 'text-brand' : 'text-ink-3')}>+{QUEST_XP}</span>
              </div>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
