import { useRef, type ReactNode } from 'react'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, X } from 'lucide-react'
import { useBlobUrl, useMediaUrl } from '../../hooks/useData'
import { prepareImage } from '../../lib/image'
import { toast } from '../../store/ui'

interface EditorBlockProps {
  title: string
  optional?: boolean
  /** Shown instead of the camera button (e.g. a collapse chevron). */
  action?: ReactNode
  onPickImage?: (blob: Blob) => void
  error?: string
  className?: string
  /** Hides the body (animated); pair with an `action` toggle. */
  collapsed?: boolean
  bodyId?: string
  children: ReactNode
}

/** Large white input block with a title row, as used in the card editor. */
export function EditorBlock({
  title,
  optional,
  action,
  onPickImage,
  error,
  className,
  collapsed,
  bodyId,
  children,
}: EditorBlockProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  async function onFile(file: File | undefined) {
    if (!file || !onPickImage) return
    try {
      onPickImage(await prepareImage(file))
    } catch (e) {
      toast(e instanceof Error ? e.message : '無法讀取圖片', { tone: 'error' })
    }
  }

  return (
    <section
      className={clsx(
        'rounded-[18px] border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03),0_6px_20px_-6px_rgb(0_0_0/0.07)] transition-colors',
        error ? 'border-danger/60' : 'border-line',
        className,
      )}
    >
      <div className={clsx('mx-5 flex min-h-[62px] items-center gap-3 py-2', !collapsed && 'border-b border-line')}>
        <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
        {optional && <span className="rounded-md bg-fill px-2 py-0.5 text-[12px] font-medium text-ink-2">可選</span>}
        <div className="ml-auto flex items-center gap-1">
          {action}
          {onPickImage && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label={`為${title}加入圖片`}
                className="flex size-11 items-center justify-center rounded-[12px] bg-tint text-white shadow-[0_4px_12px_-4px_var(--c-tint)] transition-transform active:scale-95"
              >
                <Camera size={21} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                tabIndex={-1}
                onChange={(e) => {
                  void onFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && (
        <p className="px-5 pb-3 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

interface ImagePreviewProps {
  /** Unsaved replacement; `null` means "removed". */
  blob: Blob | null | undefined
  storedId: string | undefined
  onRemove: () => void
  alt: string
}

export function ImagePreview({ blob, storedId, onRemove, alt }: ImagePreviewProps) {
  const blobUrl = useBlobUrl(blob ?? undefined)
  const storedUrl = useMediaUrl(blob === undefined ? storedId : undefined)
  const url = blob === null ? undefined : (blobUrl ?? storedUrl)
  if (!url) return null
  return (
    <div className="relative mb-3 inline-block">
      <img src={url} alt={alt} className="max-h-52 rounded-xl border border-line object-contain" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="移除圖片"
        className="absolute -right-2.5 -top-2.5 flex size-8 items-center justify-center rounded-full bg-ink text-surface shadow-float"
      >
        <X size={16} strokeWidth={2.6} />
      </button>
    </div>
  )
}
