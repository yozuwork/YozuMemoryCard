import { useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import clsx from 'clsx'
import { Lightbulb, Volume2 } from 'lucide-react'
import type { Flashcard } from '../../types/card'
import { MediaImage } from '../card/MediaImage'
import { exampleSpeechText } from '../../lib/speech'

interface FlashcardViewProps {
  card: Flashcard
  revealed: boolean
  onReveal: () => void
  onSpeak: (text: string) => void
  speechSupported: boolean
}

type Change = 'flip' | 'next'

const variants: Variants = {
  enter: (c: Change) => (c === 'flip' ? { rotateY: -90, opacity: 1 } : { opacity: 0, y: 18, scale: 0.97 }),
  center: (c: Change) => ({
    rotateY: 0,
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    transition: c === 'flip' ? { duration: 0.2, ease: [0.2, 0.7, 0.3, 1] } : { type: 'spring', stiffness: 380, damping: 32 },
  }),
  exit: (c: Change) =>
    c === 'flip'
      ? { rotateY: 90, transition: { duration: 0.16, ease: [0.6, 0, 0.8, 0.4] } }
      : { opacity: 0, x: -36, scale: 0.97, transition: { duration: 0.16 } },
}

/** Long or multi-line text reads better left-aligned. */
const isLong = (text: string) => text.length > 70 || text.includes('\n')

function SpeakButton({ text, onSpeak, label }: { text: string; onSpeak: (t: string) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSpeak(text)
      }}
      aria-label={label}
      className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line text-ink-2 transition-colors hover:text-ink active:bg-fill"
    >
      <Volume2 size={20} />
    </button>
  )
}

export function FlashcardView({ card, revealed, onReveal, onSpeak, speechSupported }: FlashcardViewProps) {
  const [hintOpen, setHintOpen] = useState(false)
  // Remember what was last shown so we know whether to flip (same card) or
  // slide in (next card). Adjusted during render, per React's guidance.
  const [shown, setShown] = useState<{ id: string; revealed: boolean; change: Change }>({
    id: card.id,
    revealed,
    change: 'flip',
  })
  if (shown.id !== card.id || shown.revealed !== revealed) {
    setShown({ id: card.id, revealed, change: shown.id !== card.id ? 'next' : 'flip' })
    if (shown.id !== card.id) setHintOpen(false)
  }
  const change = shown.id !== card.id ? 'next' : shown.change

  return (
    <div className="w-full [perspective:1400px]">
      <AnimatePresence mode="wait" initial={false} custom={change}>
        <motion.div
          key={`${card.id}-${revealed ? 'back' : 'front'}`}
          custom={change}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          onClick={revealed ? undefined : onReveal}
          className={clsx(
            'mx-auto flex w-full max-w-[360px] flex-col items-center gap-5 rounded-[20px] border border-line bg-surface px-6 py-8 shadow-[0_2px_4px_rgb(0_0_0/0.03),0_12px_32px_-8px_rgb(0_0_0/0.10)] lg:max-w-[560px] lg:px-10 lg:py-12',
            revealed ? 'min-h-[300px]' : 'min-h-[260px] cursor-pointer justify-center lg:min-h-[340px]',
          )}
          aria-live="polite"
        >
          {speechSupported && (
            <SpeakButton
              text={revealed ? card.back : card.front}
              onSpeak={onSpeak}
              label={revealed ? '朗讀答案' : '朗讀正面'}
            />
          )}

          <div className={clsx('flex w-full flex-col items-center gap-4', revealed && 'pb-1')}>
            <MediaImage id={card.frontImage} alt="正面圖片" className="max-h-56 rounded-xl object-contain" />
            <p
              className={clsx(
                'w-full whitespace-pre-wrap [overflow-wrap:anywhere]',
                isLong(card.front) ? 'text-left' : 'text-center',
                revealed ? 'text-[19px] text-ink-2' : 'text-[26px] font-medium leading-snug text-ink lg:text-[30px]',
              )}
            >
              {card.front}
            </p>
          </div>

          {!revealed && card.hint && (
            <div className="flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {hintOpen ? (
                <p className="rounded-xl bg-fill-2 px-3 py-2 text-[15px] text-ink-2">{card.hint}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setHintOpen(true)}
                  className="flex min-h-9 items-center gap-1.5 rounded-full bg-fill-2 px-3.5 text-[14px] font-medium text-ink-2"
                >
                  <Lightbulb size={15} />
                  顯示提示
                </button>
              )}
            </div>
          )}

          {revealed && (
            <>
              <div className="h-px w-full bg-line" />
              <div className="flex w-full flex-col items-center gap-4">
                <p
                  className={clsx(
                    'w-full whitespace-pre-wrap text-[24px] font-medium leading-snug text-ink [overflow-wrap:anywhere] lg:text-[26px]',
                    isLong(card.back) ? 'text-left text-[18px] lg:text-[19px]' : 'text-center',
                  )}
                >
                  {card.back}
                </p>
                <MediaImage id={card.backImage} alt="背面圖片" className="max-h-64 rounded-xl object-contain" />
                {card.extra && (
                  <div className="flex w-full items-start gap-2 rounded-2xl bg-fill-2 py-3 pl-4 pr-2">
                    <p className="min-w-0 flex-1 whitespace-pre-wrap text-left text-[15px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
                      {card.extra}
                    </p>
                    {speechSupported && exampleSpeechText(card.extra) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSpeak(exampleSpeechText(card.extra))
                        }}
                        aria-label="朗讀例句"
                        className="-my-1 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:text-ink active:bg-fill"
                      >
                        <Volume2 size={17} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
