import { useRef, useState } from 'react'
import clsx from 'clsx'
import { ChartColumn, CloudUpload, LogIn, LogOut, Download, HardDrive, History, Info, Monitor, Moon, RotateCcw, Sun, Trash2, Upload, Volume2 } from 'lucide-react'
import { useDecks } from '../hooks/useData'
import { useStorageInfo } from '../hooks/useStorageInfo'
import { useSpeech } from '../hooks/useSpeech'
import { getSettings, useSettings } from '../store/settings'
import { confirmDialog, toast } from '../store/ui'
import { backupFilename, countTableRows, createSnapshot, downloadBlob, exportBackupBlob, ImportError, parseBackup } from '../db/backup'
import { clearAllData, resetAllProgress } from '../db/repo'
import { writeSampleData } from '../db/seed'
import { LANGUAGES } from '../lib/speech'
import { formatBytes } from '../lib/time'
import type { StudyOrder, ThemeMode } from '../types/settings'
import { PageHeader } from '../components/layout/PageHeader'
import { GlassButton } from '../components/ui/GlassButton'
import { ListRow, ListSection } from '../components/ui/List'
import { Segmented, Slider, Stepper, Switch } from '../components/ui/Controls'
import { SelectRow } from '../components/settings/SelectRow'
import { CloudSheet, ImportSheet, SnapshotsSheet, StorageSheet, type PendingImport } from '../components/settings/DataSheets'
import { LogoMark } from '../components/brand/Logo'
import { Avatar } from '../components/account/Avatar'
import { useAccount } from '../store/account'

const orderOptions: { value: StudyOrder; label: string }[] = [
  { value: 'review-first', label: '複習後再學習新卡片' },
  { value: 'new-first', label: '先學習新卡片' },
  { value: 'mixed', label: '新舊卡片交錯' },
]

const hourOptions = Array.from({ length: 24 }, (_, h) => ({ value: h, label: `${String(h).padStart(2, '0')}:00` }))

export function SettingsPage() {
  const s = useSettings()
  const account = useAccount()
  const decks = useDecks()
  const { info, requestPersist, refresh } = useStorageInfo()
  const { say, supported: speechSupported } = useSpeech()
  const fileRef = useRef<HTMLInputElement>(null)
  const [storageOpen, setStorageOpen] = useState(false)
  const [snapshotsOpen, setSnapshotsOpen] = useState(false)
  const [cloudOpen, setCloudOpen] = useState(false)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [exporting, setExporting] = useState(false)

  const notificationsSupported = 'Notification' in window
  const firstLanguage = LANGUAGES.find((l) => l.code === s.languageOrder[0])

  async function exportData() {
    setExporting(true)
    try {
      downloadBlob(await exportBackupBlob(getSettings()), backupFilename())
      toast('已匯出備份檔', { tone: 'success' })
    } catch (e) {
      console.error(e)
      toast('匯出失敗', { tone: 'error' })
    } finally {
      setExporting(false)
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const text = await file.text()
      if (/\.json$/i.test(file.name) || file.type === 'application/json') {
        let raw: unknown
        try {
          raw = JSON.parse(text)
        } catch {
          throw new ImportError('檔案不是有效的 JSON')
        }
        setPending({ kind: 'backup', file: parseBackup(raw), name: file.name })
      } else if (/\.(csv|tsv|txt)$/i.test(file.name)) {
        const rows = countTableRows(text)
        if (!rows) throw new ImportError('找不到可匯入的資料列（每列至少需要兩欄）')
        setPending({ kind: 'table', text, rows, name: file.name })
      } else {
        throw new ImportError('不支援的檔案格式，請選擇 .json、.csv 或 .tsv')
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : '無法讀取檔案', { tone: 'error' })
    }
  }

  async function toggleReminder(on: boolean) {
    if (!on) return s.set({ reminderEnabled: false })
    if (!notificationsSupported) return toast('此瀏覽器不支援通知', { tone: 'error' })
    const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    if (perm !== 'granted') return toast('通知權限未開啟，請在瀏覽器設定中允許', { tone: 'error' })
    s.set({ reminderEnabled: true })
    toast(`將於每天 ${s.reminderTime} 提醒你`, { tone: 'success' })
  }

  async function resetSettings() {
    const ok = await confirmDialog({
      title: '還原系統預設？',
      message: '語音、學習計畫與外觀設定會回到預設值。卡片與紀錄不受影響。',
      confirmLabel: '還原',
    })
    if (!ok) return
    s.reset()
    toast('已還原預設設定')
  }

  async function resetProgress() {
    const ok = await confirmDialog({
      title: '重置學習進度？',
      message: '所有卡片會變回新卡片，複習紀錄與統計會清空；牌組、卡片與標籤都會保留。系統會先建立一份本機快照，可在「本機備份快照」還原。',
      confirmLabel: '重置進度',
      destructive: true,
    })
    if (!ok) return
    await createSnapshot('重置進度前自動備份', getSettings())
    await resetAllProgress()
    void refresh()
    toast('已重置學習進度')
  }

  async function wipe() {
    const ok = await confirmDialog({
      title: '清除所有資料？',
      message: '所有牌組、卡片、標籤、圖片與複習紀錄都會被刪除。系統會先建立一份本機快照，可在「本機備份快照」還原。',
      confirmLabel: '全部清除',
      destructive: true,
    })
    if (!ok) return
    await createSnapshot('清除前自動備份', getSettings())
    await clearAllData()
    void refresh()
    toast('已清除所有資料')
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader
        title="選項"
        trailing={<GlassButton onClick={() => void resetSettings()}>還原系統預設</GlassButton>}
      />

      {/* 帳號 */}
      <ListSection title="帳號" footer="登入 Google 帳號後，可把資料備份到雲端，換裝置時還原。">
        {account.user ? (
          <>
            <ListRow icon={<Avatar user={account.user} size={30} />} label={account.user.displayName ?? '已登入'} detail={account.user.email ?? undefined} />
            <ListRow
              icon={<LogOut size={21} className="text-danger" />}
              label="登出"
              destructive
              disabled={account.busy}
              onClick={() => void account.signOut()}
            />
          </>
        ) : (
          <ListRow
            icon={<LogIn size={21} className="text-tint" />}
            label={account.user === undefined ? '載入中…' : '使用 Google 登入'}
            tint
            disabled={account.busy || account.user === undefined}
            onClick={() => void account.signIn()}
          />
        )}
      </ListSection>

      {/* 資料 */}
      <ListSection
        title={
          <>
            資料
            <span
              className={clsx('size-2 rounded-full', info.persisted ? 'bg-success' : 'bg-tint')}
              title={info.persisted ? '已啟用持久儲存' : '資料儲存在本機'}
              aria-hidden
            />
          </>
        }
      >
        <ListRow
          icon={<HardDrive size={21} className="text-ink" />}
          label="資料儲存在此裝置"
          detail={info.usage !== undefined ? `已使用 ${formatBytes(info.usage)}${info.persisted ? ' · 持久儲存' : ''}` : '離線可用的 IndexedDB'}
          onClick={() => setStorageOpen(true)}
          accessory={<Info size={21} className="text-tint" aria-label="詳細資訊" />}
        />
        <ListRow
          icon={<Upload size={21} className="text-tint" />}
          label="匯入資料"
          tint
          value={<span className="text-[14px]">*.json *.csv *.tsv</span>}
          chevron
          onClick={() => fileRef.current?.click()}
        />
        <ListRow
          icon={<Download size={21} className="text-tint" />}
          label={exporting ? '匯出中…' : '匯出備份'}
          tint
          detail="包含卡片、圖片、複習紀錄與設定"
          disabled={exporting}
          onClick={() => void exportData()}
        />
        <ListRow
          icon={<History size={21} className="text-tint" />}
          label="本機備份快照"
          tint
          chevron
          onClick={() => setSnapshotsOpen(true)}
        />
        <ListRow
          icon={<CloudUpload size={21} className="text-tint" />}
          label="雲端備份"
          tint
          detail={account.user ? '上傳或還原雲端上的資料' : '登入後即可使用'}
          chevron
          onClick={() => setCloudOpen(true)}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,.tsv,.txt,application/json,text/csv,text/tab-separated-values"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </ListSection>

      {/* 語音 */}
      <ListSection
        title="語音"
        footer={speechSupported ? '朗讀會依文字自動判斷語言，遇到中日共用漢字時依「偏好的語言順序」決定。' : '此瀏覽器不支援語音朗讀（Web Speech API）。'}
      >
        <div className="list-row flex items-center gap-3 pl-4">
          <div className="list-row-body flex min-h-[56px] flex-1 items-center gap-4 pr-4">
            <span className="shrink-0 text-[16px] text-ink">語速</span>
            <Slider
              value={s.speechRate}
              onChange={(v) => s.set({ speechRate: v })}
              min={0.5}
              max={2}
              step={0.1}
              label="語速"
              valueText={`${s.speechRate.toFixed(1)} 倍`}
            />
            <span className="w-10 shrink-0 text-right text-[16px] tabular-nums text-ink-2">{s.speechRate.toFixed(1)}x</span>
            <button
              type="button"
              disabled={!speechSupported}
              onClick={() => void say(firstLanguage?.sample ?? '你好', firstLanguage?.code)}
              aria-label="試聽語速"
              className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-tint hover:bg-fill-2 disabled:opacity-30"
            >
              <Volume2 size={20} />
            </button>
          </div>
        </div>
        <ListRow label="偏好的語言順序" value={firstLanguage?.label} chevron to="/settings/languages" />
        <ListRow
          label="自動朗讀卡片正面"
          accessory={<Switch label="自動朗讀卡片正面" checked={s.autoSpeakFront} disabled={!speechSupported} onChange={(v) => s.set({ autoSpeakFront: v })} />}
        />
        <ListRow
          label="自動朗讀卡片背面"
          accessory={<Switch label="自動朗讀卡片背面" checked={s.autoSpeakBack} disabled={!speechSupported} onChange={(v) => s.set({ autoSpeakBack: v })} />}
        />
      </ListSection>

      {/* 計劃 */}
      <ListSection
        title="計劃"
        footer="每日上限分別套用在各牌組；選擇「所有筆記」複習時則為合計。目標記憶保持率越高，複習越頻繁。"
      >
        <SelectRow label="學習/複習順序" value={s.studyOrder} options={orderOptions} onChange={(v) => s.set({ studyOrder: v })} />
        <ListRow
          label="每日新卡片"
          accessory={<Stepper label="每日新卡片" value={s.newPerDay} min={0} max={500} step={5} onChange={(v) => s.set({ newPerDay: v })} />}
        />
        <ListRow
          label="每日複習上限"
          accessory={<Stepper label="每日複習上限" value={s.reviewsPerDay} min={10} max={2000} step={10} onChange={(v) => s.set({ reviewsPerDay: v })} />}
        />
        <ListRow
          label="目標記憶保持率"
          accessory={
            <Stepper
              label="目標記憶保持率"
              value={Math.round(s.retention * 100)}
              min={70}
              max={97}
              onChange={(v) => s.set({ retention: v / 100 })}
              format={(v) => `${v}%`}
            />
          }
        />
        <SelectRow label="一天開始於" value={s.dayStartHour} options={hourOptions} onChange={(v) => s.set({ dayStartHour: v })} />
      </ListSection>

      {/* 提醒 */}
      <ListSection
        title="提醒"
        footer={
          notificationsSupported
            ? '網頁 App 沒有推播伺服器，提醒只會在 App 開啟（含背景分頁）時送出；關閉後不會通知。'
            : '此瀏覽器不支援通知。'
        }
      >
        <ListRow
          label="每日學習提醒"
          accessory={<Switch label="每日學習提醒" checked={s.reminderEnabled} disabled={!notificationsSupported} onChange={(v) => void toggleReminder(v)} />}
        />
        <div className="list-row flex items-center gap-3 pl-4">
          <label className="list-row-body flex min-h-[52px] flex-1 items-center gap-3 pr-4">
            <span className={clsx('flex-1 text-[16px]', s.reminderEnabled ? 'text-ink' : 'text-ink-2')}>提醒時間</span>
            <input
              type="time"
              value={s.reminderTime}
              disabled={!s.reminderEnabled}
              onChange={(e) => e.target.value && s.set({ reminderTime: e.target.value })}
              className="min-h-9 rounded-[9px] bg-fill px-2.5 text-[16px] tabular-nums text-tint outline-none disabled:text-ink-2"
            />
          </label>
        </div>
      </ListSection>

      {/* 外觀 */}
      <ListSection title="外觀">
        <div className="p-3">
          <Segmented<ThemeMode>
            label="外觀模式"
            value={s.theme}
            onChange={(v) => s.set({ theme: v })}
            options={[
              { value: 'light', label: <span className="flex items-center justify-center gap-1.5"><Sun size={15} />淺色</span> },
              { value: 'dark', label: <span className="flex items-center justify-center gap-1.5"><Moon size={15} />深色</span> },
              { value: 'system', label: <span className="flex items-center justify-center gap-1.5"><Monitor size={15} />系統</span> },
            ]}
          />
        </div>
      </ListSection>

      {/* 其他 */}
      <ListSection title="其他">
        <ListRow icon={<ChartColumn size={21} className="text-ink" />} label="學習統計" chevron to="/stats" />
        <ListRow
          label="加入範例牌組"
          tint
          detail="英文單字、React 面試題、日文 N3"
          onClick={async () => {
            await writeSampleData()
            toast('已加入範例牌組', { tone: 'success' })
          }}
        />
        <ListRow icon={<RotateCcw size={21} className="text-danger" />} label="重置學習進度" destructive onClick={() => void resetProgress()} />
        <ListRow icon={<Trash2 size={21} className="text-danger" />} label="清除所有資料" destructive onClick={() => void wipe()} />
      </ListSection>

      <div className="flex flex-col items-center gap-2 pb-4 pt-2 text-center">
        <LogoMark size={44} className="rounded-[13px] shadow-card" />
        <p className="text-[13px] text-ink-2">
          YoZu 記憶卡 · FSRS 間隔重複
          <br />
          {decks ? `${decks.length} 個牌組` : ''}
        </p>
      </div>

      <StorageSheet open={storageOpen} onClose={() => setStorageOpen(false)} info={info} onPersist={requestPersist} />
      <SnapshotsSheet open={snapshotsOpen} onClose={() => setSnapshotsOpen(false)} />
      <CloudSheet
        open={cloudOpen}
        onClose={() => setCloudOpen(false)}
        onRestore={(file) => setPending({ kind: 'backup', file, name: '雲端備份' })}
      />
      <ImportSheet pending={pending} onClose={() => setPending(null)} decks={decks ?? []} />
    </div>
  )
}
