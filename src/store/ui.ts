import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  tone: 'default' | 'success' | 'error'
  action?: { label: string; run: () => void }
}

export interface ConfirmRequest {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  resolve: (ok: boolean) => void
}

interface UiStore {
  toasts: Toast[]
  confirmRequest: ConfirmRequest | null
  pushToast: (t: Omit<Toast, 'id' | 'tone'> & { tone?: Toast['tone'] }) => void
  dismissToast: (id: number) => void
  settleConfirm: (ok: boolean) => void
}

let nextToastId = 1

export const useUi = create<UiStore>()((set, get) => ({
  toasts: [],
  confirmRequest: null,
  pushToast: (t) => {
    const id = nextToastId++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { tone: 'default', ...t, id }] }))
    setTimeout(() => get().dismissToast(id), t.action ? 5000 : 2800)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  settleConfirm: (ok) => {
    get().confirmRequest?.resolve(ok)
    set({ confirmRequest: null })
  },
}))

export function toast(message: string, opts: Partial<Omit<Toast, 'id' | 'message'>> = {}) {
  useUi.getState().pushToast({ message, ...opts })
}

/** Promise-based replacement for window.confirm, rendered by <ConfirmHost />. */
export function confirmDialog(req: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    useUi.getState().confirmRequest?.resolve(false)
    useUi.setState({ confirmRequest: { ...req, resolve } })
  })
}
