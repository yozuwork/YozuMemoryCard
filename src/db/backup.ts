import { db } from './schema'
import { uid } from '../lib/id'
import { newSchedule } from '../lib/scheduler'
import { colorNames } from '../lib/deckColors'
import type { Flashcard, MediaItem, ReviewLogEntry } from '../types/card'
import type { Deck, Tag } from '../types/deck'
import type { Settings } from '../types/settings'

export const BACKUP_FORMAT = 'yozuanki-backup'
const MAX_SNAPSHOTS = 10

interface SerializedMedia {
  id: string
  type: string
  createdAt: number
  data: string
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: 1
  exportedAt: number
  settings?: Partial<Settings>
  decks: Deck[]
  cards: Flashcard[]
  tags: Tag[]
  reviews: ReviewLogEntry[]
  media: SerializedMedia[]
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  // Chunked to stay under the argument limit of String.fromCharCode.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

function base64ToBlob(data: string, type: string): Blob {
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

export async function buildBackup(settings?: Partial<Settings>): Promise<BackupFile> {
  const [decks, cards, tags, reviews, media] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.tags.toArray(),
    db.reviews.toArray(),
    db.media.toArray(),
  ])
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: Date.now(),
    settings,
    decks,
    cards,
    tags,
    reviews,
    media: await Promise.all(
      media.map(async (m) => ({ id: m.id, type: m.type, createdAt: m.createdAt, data: await blobToBase64(m.blob) })),
    ),
  }
}

export async function exportBackupBlob(settings?: Partial<Settings>): Promise<Blob> {
  return new Blob([JSON.stringify(await buildBackup(settings))], { type: 'application/json' })
}

export class ImportError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

/** Validates a parsed backup and fills defaults for fields older files may lack. */
export function parseBackup(raw: unknown): BackupFile {
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) throw new ImportError('這不是 YoZuAnki 的備份檔')
  const list = (key: string) => {
    const v = raw[key]
    if (v === undefined) return []
    if (!Array.isArray(v)) throw new ImportError(`備份檔欄位「${key}」格式錯誤`)
    return v.filter(isObj)
  }
  const color = (v: unknown) => (colorNames.includes(v as never) ? (v as Deck['color']) : 'rose')
  const now = Date.now()

  const decks: Deck[] = list('decks')
    .filter((d) => typeof d.id === 'string' && typeof d.name === 'string')
    .map((d) => ({
      id: str(d.id),
      name: str(d.name),
      description: str(d.description),
      color: color(d.color),
      ...(typeof d.packKey === 'string' && { packKey: d.packKey }),
      ...(typeof d.coverImage === 'string' && { coverImage: d.coverImage }),
      createdAt: num(d.createdAt, now),
      updatedAt: num(d.updatedAt, now),
    }))
  const deckIds = new Set(decks.map((d) => d.id))

  const cards: Flashcard[] = list('cards')
    .filter((c) => typeof c.id === 'string' && deckIds.has(str(c.deckId)))
    .map((c) => {
      const base = newSchedule(num(c.createdAt, now))
      return {
        ...base,
        ...(c as Partial<Flashcard>),
        id: str(c.id),
        deckId: str(c.deckId),
        front: str(c.front),
        back: str(c.back),
        hint: str(c.hint),
        extra: str(c.extra),
        tagIds: Array.isArray(c.tagIds) ? c.tagIds.filter((t): t is string => typeof t === 'string') : [],
        starred: c.starred === true,
        due: num(c.due, base.due),
        state: ([0, 1, 2, 3].includes(num(c.state, -1)) ? c.state : 0) as Flashcard['state'],
        createdAt: num(c.createdAt, now),
        updatedAt: num(c.updatedAt, now),
      }
    })

  const tags: Tag[] = list('tags')
    .filter((t) => typeof t.id === 'string' && typeof t.name === 'string')
    .map((t) => ({ id: str(t.id), name: str(t.name), color: color(t.color), createdAt: num(t.createdAt, now) }))

  const reviews = list('reviews').filter(
    (r) => typeof r.id === 'string' && typeof r.cardId === 'string' && isObj(r.prev),
  ) as unknown as ReviewLogEntry[]

  const media = list('media').filter(
    (m) => typeof m.id === 'string' && typeof m.data === 'string',
  ) as unknown as SerializedMedia[]

  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: num(raw.exportedAt, now),
    settings: isObj(raw.settings) ? (raw.settings as Partial<Settings>) : undefined,
    decks,
    cards,
    tags,
    reviews,
    media,
  }
}

export type ImportMode = 'merge' | 'replace'

export interface ImportResult {
  decks: number
  cards: number
  tags: number
}

export async function importBackup(file: BackupFile, mode: ImportMode): Promise<ImportResult> {
  const media: MediaItem[] = file.media.map((m) => ({
    id: m.id,
    type: m.type,
    createdAt: m.createdAt,
    blob: base64ToBlob(m.data, m.type),
  }))
  await db.transaction('rw', [db.decks, db.cards, db.tags, db.reviews, db.media], async () => {
    if (mode === 'replace') {
      await Promise.all([db.decks.clear(), db.cards.clear(), db.tags.clear(), db.reviews.clear(), db.media.clear()])
    }
    await db.decks.bulkPut(file.decks)
    await db.tags.bulkPut(file.tags)
    await db.cards.bulkPut(file.cards)
    await db.reviews.bulkPut(file.reviews)
    await db.media.bulkPut(media)
  })
  return { decks: file.decks.length, cards: file.cards.length, tags: file.tags.length }
}

/* -------------------------------------------------------------- snapshots */

export async function createSnapshot(label: string, settings?: Partial<Settings>) {
  const backup = await buildBackup(settings)
  const data = new Blob([JSON.stringify(backup)], { type: 'application/json' })
  await db.backups.add({
    id: uid('snap'),
    createdAt: Date.now(),
    label,
    size: data.size,
    cardCount: backup.cards.length,
    data,
  })
  const all = await db.backups.orderBy('createdAt').reverse().primaryKeys()
  if (all.length > MAX_SNAPSHOTS) await db.backups.bulkDelete(all.slice(MAX_SNAPSHOTS))
}

export async function readSnapshot(id: string): Promise<BackupFile> {
  const snap = await db.backups.get(id)
  if (!snap) throw new ImportError('找不到這份備份')
  return parseBackup(JSON.parse(await snap.data.text()))
}

/* ---------------------------------------------------------------- CSV/TSV */

/** RFC-4180-ish parser that also accepts tab separated text. */
export function parseDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"' && field === '') quoted = true
    else if (ch === sep) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

/** Rows with at least front and back columns. */
export function countTableRows(text: string): number {
  return parseDelimited(text).filter((r) => r.length >= 2).length
}

/**
 * Imports rows of `front, back[, hint[, extra[, tags]]]` into a deck. Tags are
 * separated by spaces or semicolons and created when missing.
 */
export async function importDelimited(text: string, deckId: string): Promise<number> {
  let rows = parseDelimited(text)
  if (rows.length && /^(front|正面|question|問題)$/i.test(rows[0][0]?.trim() ?? '')) rows = rows.slice(1)
  rows = rows.filter((r) => (r[0]?.trim() ?? '') !== '' && (r[1]?.trim() ?? '') !== '')
  if (rows.length === 0) throw new ImportError('檔案中沒有可匯入的資料（每列至少需要正面與背面兩欄）')

  await db.transaction('rw', [db.cards, db.tags], async () => {
    const tags = await db.tags.toArray()
    const byName = new Map(tags.map((t) => [t.name.toLowerCase(), t.id]))
    const now = Date.now()
    const cards: Flashcard[] = []
    for (const [i, r] of rows.entries()) {
      const tagIds: string[] = []
      for (const name of (r[4] ?? '').split(/[;\s]+/).filter(Boolean)) {
        let id = byName.get(name.toLowerCase())
        if (!id) {
          id = uid('tag')
          await db.tags.add({ id, name, color: colorNames[byName.size % colorNames.length], createdAt: now })
          byName.set(name.toLowerCase(), id)
        }
        if (!tagIds.includes(id)) tagIds.push(id)
      }
      const ts = now + i
      cards.push({
        id: uid('card'),
        deckId,
        front: r[0].trim(),
        back: r[1].trim(),
        hint: r[2]?.trim() ?? '',
        extra: r[3]?.trim() ?? '',
        tagIds,
        starred: false,
        ...newSchedule(ts),
        createdAt: ts,
        updatedAt: ts,
      })
    }
    await db.cards.bulkAdd(cards)
  })
  return rows.length
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function backupFilename(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `yozuanki-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`
}
