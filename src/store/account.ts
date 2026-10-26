import { create } from 'zustand'
import type { CloudUser } from '../lib/cloud'
import { toast } from './ui'

// Firebase is pulled in lazily so it never blocks the first paint.
const loadCloud = () => import('../lib/cloud')

interface AccountStore {
  /** undefined while Firebase is still loading. */
  user: CloudUser | null | undefined
  busy: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAccount = create<AccountStore>()((set) => ({
  user: undefined,
  busy: false,
  signIn: async () => {
    set({ busy: true })
    try {
      await (await loadCloud()).signIn()
      toast('已登入', { tone: 'success' })
    } catch (e) {
      console.error(e)
      toast('登入失敗，請再試一次', { tone: 'error' })
    } finally {
      set({ busy: false })
    }
  },
  signOut: async () => {
    set({ busy: true })
    try {
      await (await loadCloud()).signOutCloud()
      toast('已登出')
    } catch (e) {
      console.error(e)
      toast('登出失敗', { tone: 'error' })
    } finally {
      set({ busy: false })
    }
  },
}))

let started = false

/** Subscribes to Firebase auth once for the whole app. */
export function startAccountWatch() {
  if (started) return
  started = true
  loadCloud()
    .then((cloud) =>
      cloud.watchUser((u) =>
        useAccount.setState({ user: u && { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL } }),
      ),
    )
    .catch((e) => {
      console.error(e)
      useAccount.setState({ user: null })
    })
}
