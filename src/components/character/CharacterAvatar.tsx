import clsx from 'clsx'
import { motion } from 'motion/react'
import { ImagePlus } from 'lucide-react'
import { useMediaUrl } from '../../hooks/useData'
import { CHARACTER_IMAGE_ID } from '../../store/character'

/** Four-point star used for the twinkling sparkles. */
export function Sparkle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      <path d="M12 0c.9 6.6 4.8 10.6 12 12-7.2 1.4-11.1 5.4-12 12-.9-6.6-4.8-10.6-12-12C7.2 10.6 11.1 6.6 12 0Z" fill="currentColor" />
    </svg>
  )
}

const sparkles = [
  { left: '8%', top: '18%', size: 22, delay: 0 },
  { left: '18%', top: '4%', size: 11, delay: 0.9 },
  { left: '84%', top: '12%', size: 16, delay: 0.4 },
  { left: '90%', top: '58%', size: 24, delay: 1.3 },
  { left: '4%', top: '66%', size: 13, delay: 1.8 },
]

/**
 * The character "stage": uploaded picture floating above a glowing platform,
 * with sparkles twinkling around it. Falls back to an upload prompt.
 */
export function CharacterStage({ onUpload, className }: { onUpload?: () => void; className?: string }) {
  const url = useMediaUrl(CHARACTER_IMAGE_ID)

  return (
    <div className={clsx('relative mx-auto aspect-square w-full max-w-[280px]', className)}>
      {/* aura + platform */}
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgb(183_156_246/0.55),rgb(245_160_198/0.18)_55%,transparent_70%)] blur-2xl" aria-hidden />
      <div className="absolute bottom-[4%] left-1/2 h-[12%] w-[64%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(183_156_246/0.7),transparent)] blur-md" aria-hidden />
      <div className="absolute bottom-[7%] left-1/2 h-[5%] w-[46%] -translate-x-1/2 rounded-[50%] border border-white/25" aria-hidden />

      {sparkles.map((s, i) => (
        <motion.span
          key={i}
          className="absolute text-white"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
          animate={{ opacity: [0.25, 1, 0.25], scale: [0.7, 1.1, 0.7], rotate: [0, 45, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
          aria-hidden
        >
          <Sparkle className="size-full drop-shadow-[0_0_6px_rgb(255_255_255/0.8)]" />
        </motion.span>
      ))}

      <motion.div
        className="absolute inset-x-[10%] bottom-[9%] top-[2%] flex items-end justify-center"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {url ? (
          <img
            src={url}
            alt="我的角色"
            draggable={false}
            className="max-h-full max-w-full rounded-[20px] object-contain drop-shadow-[0_18px_28px_rgb(0_0_0/0.45)]"
          />
        ) : (
          <button
            type="button"
            onClick={onUpload}
            className="mb-[8%] flex aspect-square w-[70%] flex-col items-center justify-center gap-2 rounded-full border-2 border-dashed border-white/35 bg-white/5 text-white/85 transition-colors hover:bg-white/10"
          >
            <ImagePlus size={30} strokeWidth={1.8} />
            <span className="text-[14px] font-semibold">上傳角色圖片</span>
            <span className="text-[11px] text-white/55">建議去背 PNG</span>
          </button>
        )}
      </motion.div>
    </div>
  )
}

/** Small round portrait (level-up overlay, etc.). */
export function CharacterPortrait({ className }: { className?: string }) {
  const url = useMediaUrl(CHARACTER_IMAGE_ID)
  return (
    <div className={clsx('overflow-hidden rounded-full bg-[linear-gradient(135deg,#f5a0c6,#b79cf6)]', className)}>
      {url ? (
        <img src={url} alt="" draggable={false} className="size-full object-cover object-top" />
      ) : (
        <Sparkle className="m-auto size-1/2 translate-y-1/2 text-white" />
      )}
    </div>
  )
}
