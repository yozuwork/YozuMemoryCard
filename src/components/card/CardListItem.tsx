import { useRef } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import clsx from 'clsx'
import { Check, Star, Trash2 } from 'lucide-react'
import { CardState, type Flashcard } from '../../types/card'
import type { Deck, Tag } from '../../types/deck'
import { stateLabel } from '../../lib/ratings'
import { formatRelativePast } from '../../lib/time'
import { getColor } from '../../lib/deckColors'
import { RetentionRing } from './RetentionRing'
import { MediaImage } from './MediaImage'

const ACTION_WIDTH = 88

interface CardListItemProps {
  card: Flashcard
  deck?: Deck
  tags: Tag[]
  retention: number
  dateLabelFrom: 'createdAt' | 'updatedAt'
  selecting: boolean
  selected: boolean
  onOpen: () => void
  onToggleSelect: () => void
  onLongPress: () => void
  onDelete: () => void
}

/**
 * Note card. Swipe left reveals 刪除 (touch), long-press starts multi-select.
 * Both have visible alternatives: the 編輯 mode in the page header.
 */
export function CardListItem({
  card,
  deck,
  tags,
  retention,
  dateLabelFrom,
  selecting,
  selected,
  onOpen,
  onToggleSelect,
  onLongPress,
  onDelete,
}: CardListItemProps) {
  const x = useMotionValue(0)
  const actionOpacity = useTransform(x, [-ACTION_WIDTH, -24, 0], [1, 0.6, 0])
  const pressTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pressStart = useRef<{ x: number; y: number } | null>(null)
  const longPressed = useRef(false)
  const dragged = useRef(false)

  const close = () => animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 })

  function onPointerDown(e: React.PointerEvent) {
    if (selecting || e.button !== 0) return
    longPressed.current = false
    pressStart.current = { x: e.clientX, y: e.clientY }
    pressTimer.current = setTimeout(() => {
      longPressed.current = true
      navigator.vibrate?.(10)
      onLongPress()
    }, 480)
  }
  function onPointerMove(e: React.PointerEvent) {
    const s = pressStart.current
    if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8) clearTimeout(pressTimer.current)
  }
  function onPointerEnd() {
    clearTimeout(pressTimer.current)
    pressStart.current = null
  }

  function handleClick() {
    if (longPressed.current || dragged.current) return
    if (selecting) return onToggleSelect()
    if (x.get() < -4) return void close()
    onOpen()
  }

  const cardTags = tags.filter((t) => card.tagIds.includes(t.id))
  const isLongFront = card.front.length > 40

  return (
    <div className="group/note relative h-full">
      {/* Swipe action, revealed behind the card */}
      {!selecting && (
        <motion.button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => {
            close()
            onDelete()
          }}
          style={{ opacity: actionOpacity }}
          className="absolute inset-y-0 right-0 flex w-[120px] items-center justify-end rounded-[22px] bg-danger pr-6 text-[15px] font-medium text-white"
        >
          刪除
        </motion.button>
      )}

      <motion.div
        role="button"
        tabIndex={0}
        aria-pressed={selecting ? selected : undefined}
        aria-label={`${card.front}，${stateLabel[card.state]}${selecting ? (selected ? '，已選取' : '，未選取') : ''}`}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
          if ((e.key === 'Delete' || e.key === 'Backspace') && !selecting) onDelete()
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onContextMenu={(e) => e.preventDefault()}
        drag={selecting ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        dragSnapToOrigin={false}
        onDragStart={() => {
          dragged.current = true
          clearTimeout(pressTimer.current)
        }}
        onDragEnd={(_, info) => {
          const open = info.offset.x < -48 || info.velocity.x < -400
          animate(x, open ? -ACTION_WIDTH : 0, { type: 'spring', stiffness: 500, damping: 40 })
          setTimeout(() => (dragged.current = false), 0)
        }}
        style={{ x, touchAction: 'pan-y' }}
        className={clsx(
          'relative flex h-full select-none gap-3 rounded-[22px] bg-surface p-5 shadow-card outline-offset-2 transition-[box-shadow] [-webkit-touch-callout:none]',
          selected && 'shadow-[0_0_0_2px_var(--c-tint)]',
        )}
      >
        {selecting && (
          <span
            className={clsx(
              'mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
              selected ? 'border-tint bg-tint text-white' : 'border-ink-3',
            )}
            aria-hidden
          >
            {selected && <Check size={13} strokeWidth={3.2} />}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-end gap-2.5">
            {card.starred && <Star size={15} className="mr-auto text-[#FFB300]" fill="#FFC53D" strokeWidth={1.5} aria-label="已收藏" />}
            <span className="text-[14px] font-medium text-ink-2">{formatRelativePast(card[dateLabelFrom])}</span>
            <RetentionRing value={retention} isNew={card.state === CardState.New} />
          </div>

          <div className="flex items-start gap-3">
            <p
              className={clsx(
                'line-clamp-2 min-w-0 flex-1 font-semibold leading-snug text-ink [overflow-wrap:anywhere]',
                isLongFront ? 'text-[17px]' : 'text-[20px]',
              )}
            >
              {card.front || <span className="text-ink-2">（僅圖片）</span>}
            </p>
            {card.frontImage && (
              <MediaImage id={card.frontImage} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
            )}
          </div>
          {card.back && <p className="mt-1 line-clamp-1 text-[15px] text-ink-2">{card.back}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] font-medium text-ink-2">
            <span>重複 {card.reps}</span>
            <span>{stateLabel[card.state]}</span>
            {deck && (
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-full" style={{ background: getColor(deck.color).solid }} aria-hidden />
                <span className="max-w-[9rem] truncate">{deck.name}</span>
              </span>
            )}
            {cardTags.map((t) => (
              <span key={t.id} className="text-[13px] font-semibold" style={{ color: getColor(t.color).to }}>
                #{t.name}
              </span>
            ))}
          </div>
        </div>

        {/* Pointer users without swipe get an explicit delete button on hover. */}
        {!selecting && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            aria-label={`刪除「${card.front}」`}
            className="absolute bottom-3 right-3 hidden size-9 items-center justify-center rounded-full text-ink-3 opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 [@media(hover:hover)]:flex [@media(hover:hover)]:group-hover/note:opacity-100"
          >
            <Trash2 size={17} />
          </button>
        )}
      </motion.div>
    </div>
  )
}
