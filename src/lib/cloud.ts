import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { get, getDatabase, ref, update } from 'firebase/database'
import { buildBackup, ImportError, parseBackup, type BackupFile } from '../db/backup'
import type { Settings } from '../types/settings'

const env = import.meta.env
if (!env.VITE_FIREBASE_API_KEY) throw new Error('缺少 Firebase 設定，請參考 .env.example 建立 .env.local')

// Web API keys are public identifiers; access is enforced by database.rules.json.
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

const auth = getAuth(app)
const database = getDatabase(app)

// Realtime Database caps a single string value at 10 MB.
const MAX_BACKUP_BYTES = 10 * 1024 * 1024

export type CloudUser = Pick<User, 'uid' | 'displayName' | 'email' | 'photoURL'>

export interface CloudBackupMeta {
  exportedAt: number
  decks: number
  cards: number
  size: number
}

export function watchUser(cb: (user: CloudUser | null) => void) {
  return onAuthStateChanged(auth, cb)
}

export async function signIn() {
  await signInWithPopup(auth, new GoogleAuthProvider())
}

export async function signOutCloud() {
  await signOut(auth)
}

function userPath(): string {
  const user = auth.currentUser
  if (!user) throw new ImportError('請先登入')
  return `yozuMemoryCard/${user.uid}`
}

export async function readCloudMeta(): Promise<CloudBackupMeta | null> {
  const snap = await get(ref(database, `${userPath()}/backupMeta`))
  return snap.exists() ? (snap.val() as CloudBackupMeta) : null
}

/** Stores the backup as one JSON string so array/key quirks of the database never touch it. */
export async function uploadCloudBackup(settings?: Partial<Settings>): Promise<CloudBackupMeta> {
  const backup = await buildBackup(settings)
  const data = JSON.stringify(backup)
  const size = new Blob([data]).size
  if (size > MAX_BACKUP_BYTES) throw new ImportError('資料超過 10 MB 雲端上限，請減少卡片中的圖片後再試')
  const meta: CloudBackupMeta = { exportedAt: backup.exportedAt, decks: backup.decks.length, cards: backup.cards.length, size }
  await update(ref(database, userPath()), { backupData: data, backupMeta: meta })
  return meta
}

export async function downloadCloudBackup(): Promise<BackupFile> {
  const snap = await get(ref(database, `${userPath()}/backupData`))
  if (!snap.exists()) throw new ImportError('雲端還沒有備份')
  return parseBackup(JSON.parse(snap.val() as string))
}
