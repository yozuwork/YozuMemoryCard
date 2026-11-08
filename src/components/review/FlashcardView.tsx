import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import clsx from 'clsx'
import { ChevronDown, Lightbulb, Play, Turtle, Volume2, VolumeX } from 'lucide-react'
import type { Flashcard } from '../../types/card'
import type { SentenceMode, StudyMode } from '../../types/settings'
import { MediaImage } from '../card/MediaImage'
import { exampleSpeechText } from '../../lib/speech'
import { backSpeech, frontSpeech, isSentence, JA, japaneseParts, sentenceSpeech, type JapaneseParts } from '../../lib/japaneseCard'

interface FlashcardViewProps {
  card: Flashcard
  revealed: boolean
  onReveal: () => void
  onSpeak: (text: string, lang?: string, slow?: boolean) => void
  speechSupported: boolean
  /** Only applies to cards recognised as Japanese vocabulary. */
  mode: StudyMode
  /** Front of sentence cards: kana with spaces, or the original sentence. */
  sentenceMode: SentenceMode
  /** False when the device has no Japanese voice. */
  japaneseVoice: boolean
  showExampleKana: boolean
  showExampleZh: boolean
  onToggleExampleKana: () => void
  onToggleExampleZh: () => void
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

function SpeakButton({ onSpeak, label }: { onSpeak: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSpeak()
      }}
      aria-label={label}
      className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line text-ink-2 transition-colors hover:text-ink active:bg-fill"
    >
      <Volume2 size={20} />
    </button>
  )
}

function ToggleChip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={clsx(
        'min-h-7 rounded-full px-2.5 text-[12px] font-semibold transition-colors',
        active ? 'bg-fill text-ink' : 'text-ink-3 hover:text-ink-2',
      )}
    >
      {label}
    </button>
  )
}

/** The answer side of a Japanese card: word, reading, meaning, then the example with optional reading and translation. */
function JapaneseAnswer({
  parts,
  card,
  speechSupported,
  onSpeak,
  showExampleKana,
  showExampleZh,
  onToggleExampleKana,
  onToggleExampleZh,
}: { parts: JapaneseParts } & Pick<
  FlashcardViewProps,
  'card' | 'speechSupported' | 'onSpeak' | 'showExampleKana' | 'showExampleZh' | 'onToggleExampleKana' | 'onToggleExampleZh'
>) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full flex-col items-center gap-1 text-center [overflow-wrap:anywhere]">
        <p lang="ja" className="text-[28px] font-medium leading-snug text-ink lg:text-[32px]">
          {parts.kanji}
        </p>
        {parts.kana !== parts.kanji && (
          <p lang="ja" className="text-[17px] text-ink-2">
            {parts.kana}
          </p>
        )}
      </div>
      <div className="h-px w-full bg-line" />
      <p className="w-full text-center text-[22px] font-medium leading-snug text-ink [overflow-wrap:anywhere]">{parts.meaning}</p>
      <MediaImage id={card.backImage} alt="背面圖片" className="max-h-64 rounded-xl object-contain" />
      {parts.exampleJa && (
        <div className="flex w-full flex-col gap-1 rounded-2xl bg-fill-2 py-3 pl-4 pr-2 text-left">
          <div className="flex items-start gap-2">
            <p lang="ja" className="min-w-0 flex-1 whitespace-pre-wrap text-[15px] leading-relaxed text-ink [overflow-wrap:anywhere]">
              {parts.exampleJa}
            </p>
            {speechSupported && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSpeak(exampleSpeechText(parts.exampleJa), JA)
                }}
                aria-label="朗讀例句"
                className="-my-1 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:text-ink active:bg-fill"
              >
                <Volume2 size={17} />
              </button>
            )}
          </div>
          {showExampleKana && parts.exampleKana && (
            <p lang="ja" className="pr-2 text-[13px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
              {parts.exampleKana}
            </p>
          )}
          {showExampleZh && parts.exampleZh && (
            <p className="pr-2 text-[14px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{parts.exampleZh}</p>
          )}
          {(parts.exampleKana || parts.exampleZh) && (
            <div className="-ml-1.5 mt-1 flex gap-1">
              {parts.exampleKana && <ToggleChip label="假名" active={showExampleKana} onToggle={onToggleExampleKana} />}
              {parts.exampleZh && <ToggleChip label="中文" active={showExampleZh} onToggle={onToggleExampleZh} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Normal and slow playback of the whole sentence. */
function SentenceSpeakButtons({ card, onSpeak }: Pick<FlashcardViewProps, 'card' | 'onSpeak'>) {
  const line = sentenceSpeech(card)
  return (
    <div className="flex items-center gap-2">
      <SpeakButton onSpeak={() => onSpeak(line.text, line.lang)} label="朗讀句子" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSpeak(line.text, line.lang, true)
        }}
        aria-label="慢速朗讀句子"
        title="慢速"
        className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line text-ink-2 transition-colors hover:text-ink active:bg-fill"
      >
        <Turtle size={20} />
      </button>
    </div>
  )
}

/** A collapsed-by-default section of the sentence answer. */
function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="w-full rounded-2xl bg-fill-2 text-left" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between gap-2 px-4 text-[14px] font-semibold text-ink-2"
      >
        {title}
        <ChevronDown size={18} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-3.5">{children}</div>}
    </div>
  )
}

function SentenceAnswer({ card }: Pick<FlashcardViewProps, 'card'>) {
  const words = card.vocabulary?.filter((w) => w.word.trim()) ?? []
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full flex-col items-center gap-1.5 text-center [overflow-wrap:anywhere]">
        <p lang="ja" className="text-[21px] font-medium leading-relaxed text-ink lg:text-[23px]">
          {card.front}
        </p>
        {card.sentenceKana && (
          <p lang="ja" className="text-[15px] leading-relaxed text-ink-2">
            {card.sentenceKana}
          </p>
        )}
      </div>
      <div className="h-px w-full bg-line" />
      <p className="w-full whitespace-pre-wrap text-center text-[19px] font-medium leading-snug text-ink [overflow-wrap:anywhere]">
        {card.back}
      </p>
      <MediaImage id={card.backImage} alt="背面圖片" className="max-h-64 rounded-xl object-contain" />
      {(words.length > 0 || card.extra.trim()) && (
        <div className="flex w-full flex-col gap-2">
          {words.length > 0 && (
            <Disclosure title={`重要單字 · ${words.length}`}>
              <ul className="flex flex-col gap-1.5 text-[15px] leading-relaxed">
                {words.map((w, i) => (
                  <li key={i} className="[overflow-wrap:anywhere]">
                    <span lang="ja" className="font-medium text-ink">
                      {w.word}
                    </span>
                    {w.reading && (
                      <span lang="ja" className="text-ink-2">
                        （{w.reading}）
                      </span>
                    )}
                    {w.meaning && <span className="text-ink-2">：{w.meaning}</span>}
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}
          {card.extra.trim() && (
            <Disclosure title="文法解析">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{card.extra}</p>
            </Disclosure>
          )}
        </div>
      )}
    </div>
  )
}

export function FlashcardView(props: FlashcardViewProps) {
  const { card, revealed, onReveal, onSpeak, speechSupported, mode, sentenceMode, japaneseVoice } = props
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

  const parts = japaneseParts(card)
  const sentence = isSentence(card)
  // Without a kana version the original sentence is the only thing to show.
  const sentenceText = sentenceMode === 'kana' && card.sentenceKana?.trim() ? card.sentenceKana : card.front
  // Kana and listening fronts must not leak the kanji, meaning, image or hint.
  const kanaFront = !revealed && parts !== null && mode === 'kana'
  const listening = !revealed && parts !== null && mode === 'listen'
  const speakLine = (line: { text: string; lang?: string }) => onSpeak(line.text, line.lang)

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
          {listening ? (
            japaneseVoice ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  speakLine(frontSpeech(card))
                }}
                aria-label="播放發音"
                className="flex size-24 items-center justify-center rounded-full border border-line text-ink transition-colors active:bg-fill lg:size-28"
              >
                <Play size={38} className="translate-x-0.5" fill="currentColor" />
              </button>
            ) : (
              <p className="flex items-center gap-2 text-[15px] text-ink-2">
                <VolumeX size={18} />
                此裝置沒有日文語音，無法播放
              </p>
            )
          ) : sentence ? (
            speechSupported && <SentenceSpeakButtons card={card} onSpeak={onSpeak} />
          ) : (
            speechSupported && (
              <SpeakButton
                onSpeak={() => speakLine(revealed ? backSpeech(card) : frontSpeech(card))}
                label={revealed ? '朗讀答案' : '朗讀正面'}
              />
            )
          )}

          {kanaFront && (
            <p lang="ja" className="w-full text-center text-[26px] font-medium leading-snug text-ink [overflow-wrap:anywhere] lg:text-[30px]">
              {parts.kana}
            </p>
          )}

          {revealed && parts && <JapaneseAnswer parts={parts} {...props} />}

          {sentence && !revealed && (
            <div className="flex w-full flex-col items-center gap-4">
              <MediaImage id={card.frontImage} alt="正面圖片" className="max-h-56 rounded-xl object-contain" />
              <p
                lang="ja"
                className="w-full whitespace-pre-wrap text-center text-[22px] font-medium leading-relaxed text-ink [overflow-wrap:anywhere] lg:text-[26px]"
              >
                {sentenceText}
              </p>
            </div>
          )}

          {sentence && revealed && <SentenceAnswer card={card} />}

          {!sentence && !kanaFront && !listening && !(revealed && parts) && (
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
          )}

          {!revealed && card.hint && !(parts && mode !== 'kanji') && (
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

          {revealed && !parts && !sentence && (
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
