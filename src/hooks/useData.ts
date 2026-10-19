import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'

// Live IndexedDB queries. Each returns `undefined` while the first read is in flight.

export function useDecks() {
  return useLiveQuery(() => db.decks.orderBy('createdAt').toArray(), [])
}

export function useTags() {
  return useLiveQuery(() => db.tags.orderBy('createdAt').toArray(), [])
}

export function useCards() {
  return useLiveQuery(() => db.cards.toArray(), [])
}

export function useCard(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.cards.get(id)) ?? null) : null), [id])
}

export function useLogsSince(since: number) {
  return useLiveQuery(() => db.reviews.where('reviewedAt').aboveOrEqual(since).toArray(), [since])
}

export function useSnapshots() {
  return useLiveQuery(() => db.backups.orderBy('createdAt').reverse().toArray(), [])
}

/** Object URL for a stored image; revoked automatically. */
export function useMediaUrl(id: string | undefined): string | undefined {
  const item = useLiveQuery(async () => (id ? db.media.get(id) : undefined), [id])
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!item) {
      setUrl(undefined)
      return
    }
    const u = URL.createObjectURL(item.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [item])
  return url
}

/** Object URL for an in-memory blob (unsaved image previews). */
export function useBlobUrl(blob: Blob | null | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}
