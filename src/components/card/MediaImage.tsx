import clsx from 'clsx'
import { useMediaUrl } from '../../hooks/useData'

interface MediaImageProps {
  id: string | undefined
  alt: string
  className?: string
}

/** Renders an image stored in the IndexedDB media table. */
export function MediaImage({ id, alt, className }: MediaImageProps) {
  const url = useMediaUrl(id)
  if (!id) return null
  if (!url) return <div className={clsx('skeleton', className)} aria-hidden />
  return <img src={url} alt={alt} className={className} draggable={false} />
}
