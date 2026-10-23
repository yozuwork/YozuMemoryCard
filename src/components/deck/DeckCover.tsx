import clsx from 'clsx'
import { useMediaUrl } from '../../hooks/useData'
import { gradientOf } from '../../lib/deckColors'
import { coverGlyph, packCoverOf } from '../../lib/deckCovers'
import type { Deck } from '../../types/deck'

interface DeckCoverProps {
  deck: Pick<Deck, 'name' | 'color' | 'packKey' | 'coverImage'>
  /** Shows this image instead of the stored cover (e.g. a pending upload). */
  previewUrl?: string
  className?: string
}

/** Uploaded cover → built-in pack illustration → generated cover from the deck's color and name. */
export function DeckCover({ deck, previewUrl, className }: DeckCoverProps) {
  const uploaded = useMediaUrl(previewUrl ? undefined : deck.coverImage)
  const src = previewUrl ?? (deck.coverImage ? uploaded : packCoverOf(deck))
  const loading = !previewUrl && Boolean(deck.coverImage) && !uploaded

  return (
    <div className={clsx('relative overflow-hidden', className)} style={{ background: gradientOf(deck.color) }} aria-hidden>
      {src ? (
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
      ) : (
        !loading && (
          <>
            <span className="absolute -right-6 -top-10 size-36 rounded-full bg-white/15" />
            <span className="absolute -bottom-12 left-6 size-28 rounded-full bg-white/10" />
            <span className="absolute inset-0 flex items-center justify-center text-[56px] font-bold text-white/90 drop-shadow-[0_4px_12px_rgb(0_0_0/0.15)]">
              {coverGlyph(deck.name)}
            </span>
          </>
        )
      )}
    </div>
  )
}
