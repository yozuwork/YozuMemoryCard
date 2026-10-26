import { useEffect, useState } from 'react'
import { CloudDownload, CloudUpload, Database, History, LogOut, RotateCcw, ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ListRow, ListSection } from '../ui/List'
import { Skeleton } from '../ui/Controls'
import { useSnapshots } from '../../hooks/useData'
import type { StorageInfo } from '../../hooks/useStorageInfo'
import { db } from '../../db/schema'
import { createSnapshot, ImportError, importBackup, importDelimited, readSnapshot, type BackupFile } from '../../db/backup'
import { ensureDeck } from '../../db/repo'
import { formatBytes, formatDateTime } from '../../lib/time'
import type { CloudBackupMeta, CloudUser } from '../../lib/cloud'
import { getColor } from '../../lib/deckColors'
import { getSettings, useSettings } from '../../store/settings'
import { confirmDialog, toast } from '../../store/ui'
import type { Deck } from '../../types/deck'
import type { Settings } from '../../types/settings'

function applyImportedSettings(s: Partial<Settings> | undefined) {
  if (!s) return
  const { set: _s, reset: _r, ...current } = useSettings.getState()
  const allowed = Object.fromEntries(Object.entries(s).filter(([k]) => k in current))
  useSettings.getState().set(allowed as Partial<Settings>)
}

/* -------------------------------------------------------------- storage */

export function StorageSheet({
  open,
  onClose,
  info,
  onPersist,
}: {
  open: boolean
  onClose: () => void
  info: StorageInfo
  onPersist: () => Promise<boolean>
}) {
  const pct = info.usage && info.quota ? Math.max(0.5, (info.usage / info.quota) * 100) : 0
  return (
    <Modal open={open} onClose={onClose} title="資料儲存">
      <div className="mb-6 flex flex-col items-center gap-2 pt-2 text-center">
        <span className="flex size-14 items-center justify-center rounded-[18px] bg-brand text-white">
          <Database size={26} />
        </span>
        <p className="text-[17px] font-semibold text-ink">資料只存在這台裝置的瀏覽器中</p>
        <p className="max-w-sm text-[14px] leading-relaxed text-ink-2">
          卡片、圖片與複習紀錄都保存在 IndexedDB，離線也能使用。清除瀏覽器資料或更換裝置前，請先匯出備份或上傳雲端備份。
        </p>
      </div>

      <ListSection title="使用量">
        <div className="px-4 py-4">
          {info.supported && info.quota ? (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-fill">
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-[14px] text-ink-2">
                已使用 {formatBytes(info.usage ?? 0)}，可用上限約 {formatBytes(info.quota)}
              </p>
            </>
          ) : (
            <p className="text-[14px] text-ink-2">此瀏覽器不提供儲存空間估算。</p>
          )}
        </div>
      </ListSection>

      <ListSection
        title="保護資料"
        footer="持久儲存可避免瀏覽器在空間不足時自動清除資料。是否核准由瀏覽器決定；加入主畫面（PWA）通常較容易獲得核准。"
      >
        <ListRow
          icon={info.persisted ? <ShieldCheck size={20} className="text-success" /> : <ShieldAlert size={20} className="text-warning" />}
          label={info.persisted ? '已啟用持久儲存' : '尚未啟用持久儲存'}
          accessory={
            !info.persisted && (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const ok = await onPersist()
                  toast(ok ? '已啟用持久儲存' : '瀏覽器未核准，請定期匯出備份', { tone: ok ? 'success' : 'default' })
                }}
              >
                啟用
              </Button>
            )
          }
        />
      </ListSection>

    </Modal>
  )
}

/* -------------------------------------------------------------- import */

export type PendingImport =
  | { kind: 'backup'; file: BackupFile; name: string }
  | { kind: 'table'; text: string; rows: number; name: string }

export function ImportSheet({ pending, onClose, decks }: { pending: PendingImport | null; onClose: () => void; decks: Deck[] }) {
  const [deckId, setDeckId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const targetDeck = deckId || decks[0]?.id || ''

  async function runBackup(mode: 'merge' | 'replace') {
    if (pending?.kind !== 'backup') return
    if (mode === 'replace') {
      const ok = await confirmDialog({
        title: '以備份取代所有資料？',
        message: '目前所有卡片、牌組與紀錄都會被取代。系統會先自動建立一份本機快照，可在「本機備份快照」還原。',
        confirmLabel: '取代',
        destructive: true,
      })
      if (!ok) return
    }
    setBusy(true)
    try {
      if (mode === 'replace') await createSnapshot('匯入前自動備份', getSettings())
      const r = await importBackup(pending.file, mode)
      if (mode === 'replace') applyImportedSettings(pending.file.settings)
      toast(`已匯入 ${r.decks} 個牌組、${r.cards} 張卡片`, { tone: 'success' })
      onClose()
    } catch (e) {
      console.error(e)
      toast('匯入失敗：資料寫入時發生錯誤', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function runTable() {
    if (pending?.kind !== 'table') return
    setBusy(true)
    try {
      const id = await ensureDeck(targetDeck)
      const n = await importDelimited(pending.text, id)
      toast(`已匯入 ${n} 張卡片`, { tone: 'success' })
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : '匯入失敗', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={Boolean(pending)} onClose={onClose} title="匯入資料">
      {pending?.kind === 'backup' && (
        <>
          <ListSection title={pending.name}>
            <ListRow label="牌組" value={pending.file.decks.length} />
            <ListRow label="卡片" value={pending.file.cards.length} />
            <ListRow label="標籤" value={pending.file.tags.length} />
            <ListRow label="圖片" value={pending.file.media.length} />
            <ListRow label="匯出時間" value={formatDateTime(pending.file.exportedAt)} />
          </ListSection>
          <div className="flex flex-col gap-2.5">
            <Button variant="brand" size="lg" fullWidth disabled={busy} onClick={() => void runBackup('merge')}>
              合併到現有資料
            </Button>
            <Button variant="danger" size="lg" fullWidth disabled={busy} onClick={() => void runBackup('replace')}>
              取代所有資料
            </Button>
            <p className="px-2 text-center text-[13px] leading-relaxed text-ink-2">
              合併：同一張卡片以備份內容為準，其餘資料保留。
            </p>
          </div>
        </>
      )}

      {pending?.kind === 'table' && (
        <>
          <ListSection
            title={pending.name}
            footer="每列格式：正面, 背面, 提示（可選）, 額外資訊（可選）, 標籤（可選，以空格分隔）。支援逗號或 Tab 分隔，第一列若為標題會自動略過。"
          >
            <ListRow label="偵測到的資料列" value={pending.rows} />
          </ListSection>
          <ListSection title="匯入到牌組">
            {decks.map((d) => (
              <ListRow
                key={d.id}
                icon={<span className="size-3 rounded-full" style={{ background: getColor(d.color).solid }} />}
                label={d.name}
                onClick={() => setDeckId(d.id)}
                accessory={targetDeck === d.id ? <span className="text-[15px] font-semibold text-tint">✓</span> : null}
              />
            ))}
            {decks.length === 0 && <ListRow label="將自動建立「我的筆記」牌組" />}
          </ListSection>
          <Button variant="brand" size="lg" fullWidth disabled={busy} onClick={() => void runTable()}>
            匯入 {pending.rows} 張卡片
          </Button>
        </>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------ snapshots */

export function SnapshotsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const snapshots = useSnapshots()
  const [busy, setBusy] = useState(false)

  async function create() {
    setBusy(true)
    try {
      await createSnapshot('手動備份', getSettings())
      toast('已建立本機快照', { tone: 'success' })
    } catch (e) {
      console.error(e)
      toast('建立快照失敗，可能是儲存空間不足', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function restore(id: string, when: number) {
    const ok = await confirmDialog({
      title: '還原這份快照？',
      message: `目前資料會被 ${formatDateTime(when)} 的快照取代。還原前會先自動備份目前的資料。`,
      confirmLabel: '還原',
      destructive: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      const file = await readSnapshot(id)
      await createSnapshot('還原前自動備份', getSettings())
      await importBackup(file, 'replace')
      applyImportedSettings(file.settings)
      toast('已還原快照', { tone: 'success' })
      onClose()
    } catch (e) {
      console.error(e)
      toast('還原失敗', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    const ok = await confirmDialog({ title: '刪除這份快照？', confirmLabel: '刪除', destructive: true })
    if (ok) await db.backups.delete(id)
  }

  return (
    <Modal open={open} onClose={onClose} title="本機備份快照">
      <p className="mb-4 px-2 text-center text-[14px] leading-relaxed text-ink-2">
        快照儲存在此瀏覽器中，適合在大量修改前留一份還原點（最多保留 10 份）。換裝置請改用「匯出備份」。
      </p>
      <Button variant="brand" size="lg" fullWidth disabled={busy} onClick={() => void create()} icon={<History size={19} />} className="mb-6">
        立即建立快照
      </Button>
      {!snapshots ? (
        <Skeleton className="h-24 rounded-[18px]" />
      ) : snapshots.length === 0 ? (
        <p className="py-6 text-center text-[15px] text-ink-2">還沒有任何快照</p>
      ) : (
        <ListSection title={`${snapshots.length} 份快照`}>
          {snapshots.map((s) => (
            <ListRow
              key={s.id}
              label={formatDateTime(s.createdAt)}
              detail={`${s.label} · ${s.cardCount} 張卡片 · ${formatBytes(s.size)}`}
              accessory={
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void restore(s.id, s.createdAt)}
                    aria-label={`還原 ${formatDateTime(s.createdAt)} 的快照`}
                    className="flex size-10 items-center justify-center rounded-full text-tint hover:bg-fill-2"
                  >
                    <RotateCcw size={19} />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(s.id)}
                    aria-label={`刪除 ${formatDateTime(s.createdAt)} 的快照`}
                    className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger/10"
                  >
                    <Trash2 size={18} />
                  </button>
                </span>
              }
            />
          ))}
        </ListSection>
      )}
    </Modal>
  )
}

/* ---------------------------------------------------------------- cloud */

// Firebase is only downloaded once this sheet is opened.
const loadCloud = () => import('../../lib/cloud')

export function CloudSheet({
  open,
  onClose,
  onRestore,
}: {
  open: boolean
  onClose: () => void
  onRestore: (file: BackupFile) => void
}) {
  const [user, setUser] = useState<CloudUser | null | undefined>(undefined)
  const [meta, setMeta] = useState<CloudBackupMeta | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    let unsub: (() => void) | undefined
    let cancelled = false
    loadCloud()
      .then((cloud) => {
        if (cancelled) return
        unsub = cloud.watchUser((u) => {
          setUser(u)
          setMeta(undefined)
          if (u) cloud.readCloudMeta().then(setMeta, (e) => {
            console.error(e)
            setMeta(null)
          })
        })
      })
      .catch((e) => {
        console.error(e)
        toast('無法載入雲端服務，請確認網路連線', { tone: 'error' })
        setUser(null)
      })
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [open])

  async function run(task: () => Promise<void>, failure: string) {
    setBusy(true)
    try {
      await task()
    } catch (e) {
      console.error(e)
      toast(e instanceof ImportError ? e.message : failure, { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const signIn = () => run(async () => (await loadCloud()).signIn(), '登入失敗，請再試一次')
  const signOut = () => run(async () => (await loadCloud()).signOutCloud(), '登出失敗')

  const upload = () =>
    run(async () => {
      if (meta) {
        const ok = await confirmDialog({
          title: '覆蓋雲端備份？',
          message: `雲端上 ${formatDateTime(meta.exportedAt)} 的備份會被目前的資料取代。`,
          confirmLabel: '上傳',
        })
        if (!ok) return
      }
      setMeta(await (await loadCloud()).uploadCloudBackup(getSettings()))
      toast('已上傳雲端備份', { tone: 'success' })
    }, '上傳失敗，請確認網路連線')

  const restore = () =>
    run(async () => {
      const file = await (await loadCloud()).downloadCloudBackup()
      onClose()
      onRestore(file)
    }, '下載雲端備份失敗')

  return (
    <Modal open={open} onClose={onClose} title="雲端備份">
      <p className="mb-5 px-2 text-center text-[14px] leading-relaxed text-ink-2">
        用 Google 帳號把資料備份到雲端，換手機或清除瀏覽器後也能還原。雲端只保留最新一份備份。
      </p>

      {user === undefined ? (
        <Skeleton className="h-24 rounded-[18px]" />
      ) : !user ? (
        <Button variant="brand" size="lg" fullWidth disabled={busy} onClick={() => void signIn()}>
          使用 Google 登入
        </Button>
      ) : (
        <>
          <ListSection title="帳號">
            <ListRow
              label={user.displayName ?? '已登入'}
              detail={user.email ?? undefined}
              accessory={
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void signOut()}
                  aria-label="登出"
                  className="flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-fill-2"
                >
                  <LogOut size={19} />
                </button>
              }
            />
          </ListSection>

          <ListSection title="雲端上的備份">
            {meta === undefined ? (
              <Skeleton className="m-4 h-10 rounded-[12px]" />
            ) : meta === null ? (
              <ListRow label="還沒有備份" />
            ) : (
              <>
                <ListRow label="備份時間" value={formatDateTime(meta.exportedAt)} />
                <ListRow label="內容" value={`${meta.decks} 個牌組 · ${meta.cards} 張卡片`} />
                <ListRow label="大小" value={formatBytes(meta.size)} />
              </>
            )}
          </ListSection>

          <div className="flex flex-col gap-2.5">
            <Button variant="brand" size="lg" fullWidth disabled={busy || meta === undefined} onClick={() => void upload()} icon={<CloudUpload size={19} />}>
              上傳目前資料到雲端
            </Button>
            <Button variant="secondary" size="lg" fullWidth disabled={busy || !meta} onClick={() => void restore()} icon={<CloudDownload size={19} />}>
              從雲端還原
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
