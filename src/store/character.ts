import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../db/schema'

/** Media-table id of the uploaded character picture (included in backups). */
export const CHARACTER_IMAGE_ID = 'character-avatar'

export async function setCharacterImage(blob: Blob | null) {
  if (blob) await db.media.put({ id: CHARACTER_IMAGE_ID, blob, type: blob.type, createdAt: Date.now() })
  else await db.media.delete(CHARACTER_IMAGE_ID)
}

interface CharacterStore {
  name: string
  /** Highest level already celebrated, so each level-up is shown once. */
  seenLevel: number
  setName: (name: string) => void
  setSeenLevel: (level: number) => void
}

export const useCharacter = create<CharacterStore>()(
  persist(
    (set) => ({
      name: '旅人',
      seenLevel: 0,
      setName: (name) => set({ name }),
      setSeenLevel: (seenLevel) => set({ seenLevel }),
    }),
    {
      name: 'yozuanki-character',
      partialize: ({ name, seenLevel }) => ({ name, seenLevel }),
    },
  ),
)
