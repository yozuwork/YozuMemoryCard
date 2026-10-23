import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Flame, ImagePlus, PencilLine, Swords, Trash2, Trophy } from 'lucide-react'
import { useCharacterProgress } from '../hooks/useCharacterProgress'
import { useMediaUrl } from '../hooks/useData'
import { CHARACTER_IMAGE_ID, setCharacterImage, useCharacter } from '../store/character'
import { toast } from '../store/ui'
import { prepareImage } from '../lib/image'
import { titleForLevel, type LanguageProgress } from '../lib/character'
import { PageHeader } from '../components/layout/PageHeader'
import { GlassButton } from '../components/ui/GlassButton'
import { Skeleton } from '../components/ui/Controls'
import { Modal } from '../components/ui/Modal'
import { FieldWrapper, TextInput } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { CharacterStage, Sparkle } from '../components/character/CharacterAvatar'
import { QuestList } from '../components/character/QuestList'

export function CharacterPage() {
  const progress = useCharacterProgress()
  const name = useCharacter((s) => s.name)
  const [editing, setEditing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function upload(file: File | undefined) {
    if (!file) return
    try {
      await setCharacterImage(await prepareImage(file))
      toast('已更新角色圖片', { tone: 'success' })
    } catch (e) {
      toast(e instanceof Error ? e.message : '無法讀取圖片', { tone: 'error' })
    }
  }

  const quests = progress?.todayQuests ?? []
  const doneCount = quests.filter((q) => q.done).length

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      className="hidden"
      tabIndex={-1}
      onChange={(e) => {
        void upload(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader
        title="角色"
        trailing={
          <GlassButton onClick={() => setEditing(true)}>
            <PencilLine size={17} />
            編輯角色
          </GlassButton>
        }
      />
      {fileInput}

      {!progress ? (
        <Skeleton className="h-[520px] rounded-[28px]" />
      ) : (
        <>
          {/* ------------------------------------------------------- hero */}
          <section
            aria-label="角色狀態"
            className="relative overflow-hidden rounded-[28px] bg-[#120e1f] px-5 pb-6 pt-5 text-white shadow-float"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,rgb(183_156_246/0.35),transparent_70%),radial-gradient(60%_40%_at_100%_100%,rgb(245_160_198/0.2),transparent_70%)]"
              aria-hidden
            />
            <div className="relative flex items-center justify-between">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold tracking-[0.12em] text-white/80 backdrop-blur">
                {titleForLevel(progress.level.level)}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white/80">
                <Flame size={14} className="text-[#ff9f6b]" />
                連續 {progress.streak} 天
              </span>
            </div>

            <CharacterStage onUpload={() => fileRef.current?.click()} className="mt-1" />

            <div className="relative -mt-2 text-center">
              <h2 className="text-[28px] font-bold leading-tight tracking-tight">{name}</h2>
              <p className="mt-1 text-[15px] text-white/70">
                <span className="font-bold text-white">Lv. {progress.level.level}</span>
                <span className="mx-1.5 text-white/30">·</span>
                累計 {progress.level.total.toLocaleString()} EXP
              </p>
            </div>

            <ExpBar into={progress.level.into} need={progress.level.need} className="relative mt-5" />
          </section>

          {/* ------------------------------------------------------ stats */}
          <section aria-label="日語能力" className="mt-4">
            <LanguageTile p={progress.languages.ja} label="日語" accent="#f5a0c6" glyph="あ" />
          </section>

          {/* ----------------------------------------------------- quests */}
          <section aria-labelledby="quests-title" className="mt-8">
            <div className="mb-3 flex items-end justify-between px-1">
              <div>
                <h2 id="quests-title" className="text-[22px] font-bold tracking-tight text-ink">
                  今日任務
                </h2>
                <p className="text-[13px] text-ink-2">每完成一項 +20 EXP，於學習日切換時重置</p>
              </div>
              <QuestRing done={doneCount} total={quests.length} />
            </div>
            {doneCount === quests.length && quests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 flex items-center gap-2 rounded-2xl bg-brand px-4 py-3 text-[15px] font-semibold text-white"
              >
                <Trophy size={18} /> 太強了！今日任務全部完成
              </motion.div>
            )}
            <QuestList quests={quests} />
          </section>

          {/* -------------------------------------------------------- CTA */}
          <Link
            to="/review"
            className="group relative mt-8 flex min-h-[60px] items-center justify-center gap-3 overflow-hidden rounded-full bg-ink text-[17px] font-bold tracking-wide text-surface shadow-float transition-transform active:scale-[0.98]"
          >
            <span
              className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/25 blur-md transition-transform duration-700 group-hover:translate-x-[420%]"
              aria-hidden
            />
            <Sparkle className="size-4" />
            <Swords size={20} />
            開始修練
            <Sparkle className="size-4" />
          </Link>
        </>
      )}

      <EditCharacterSheet open={editing} onClose={() => setEditing(false)} onPick={() => fileRef.current?.click()} />
    </div>
  )
}

function ExpBar({ into, need, className }: { into: number; need: number; className?: string }) {
  const pct = Math.min(100, (into / need) * 100)
  return (
    <div className={className}>
      <div className="mb-1.5 flex justify-between text-[12px] font-semibold tabular-nums text-white/65">
        <span>EXP {into} / {need}</span>
        <span>升級還差 {need - into}</span>
      </div>
      <div
        className="h-3.5 overflow-hidden rounded-full bg-white/10 p-[3px]"
        role="progressbar"
        aria-label="距離下一級的經驗值"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="relative h-full overflow-hidden rounded-full bg-[linear-gradient(90deg,#f5a0c6,#b79cf6)] shadow-[0_0_12px_rgb(183_156_246/0.8)]"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 2)}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.15 }}
        >
          <motion.span
            className="absolute inset-y-0 w-10 bg-white/50 blur-sm"
            animate={{ x: ['-150%', '900%'] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
            aria-hidden
          />
        </motion.div>
      </div>
    </div>
  )
}

function LanguageTile({ p, label, accent, glyph }: { p: LanguageProgress; label: string; accent: string; glyph: string }) {
  const pct = (p.level.into / p.level.need) * 100
  return (
    <div className="flex items-center gap-4 rounded-[22px] bg-surface p-4 shadow-card">
      <span
        className="flex size-16 shrink-0 items-center justify-center rounded-[20px] text-[34px] font-black leading-none"
        style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
        aria-hidden
      >
        {glyph}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[15px] font-semibold text-ink-2">
            {label}
            <span className="ml-2 text-[24px] font-bold tabular-nums text-ink">Lv.{p.level.level}</span>
          </p>
          <span className="shrink-0 text-[12px] tabular-nums text-ink-2">
            {p.level.into} / {p.level.need}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill">
          <motion.div
            className="h-full rounded-full"
            style={{ background: accent }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.25 }}
          />
        </div>
        <p className="mt-2 text-[12px] tabular-nums text-ink-2">
          {p.total ? `已熟記 ${p.mastered} / ${p.total} 張` : `還沒有${label}卡片`}
        </p>
      </div>
    </div>
  )
}

function QuestRing({ done, total }: { done: number; total: number }) {
  const r = 18
  const c = 2 * Math.PI * r
  const pct = total ? done / total : 0
  return (
    <div className="relative size-12" role="img" aria-label={`已完成 ${done} / ${total} 項`}>
      <svg viewBox="0 0 44 44" className="size-full -rotate-90">
        <defs>
          <linearGradient id="quest-ring" x1="0" x2="1">
            <stop offset="0" stopColor="#f5a0c6" />
            <stop offset="1" stopColor="#b79cf6" />
          </linearGradient>
        </defs>
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-fill" />
        <motion.circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          stroke="url(#quest-ring)"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ type: 'spring', stiffness: 90, damping: 20 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold tabular-nums text-ink">
        {done}/{total}
      </span>
    </div>
  )
}

function EditCharacterSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="編輯角色"
      trailing={
        <button type="button" onClick={onClose} className="min-h-11 px-1 text-[17px] font-semibold text-tint">
          完成
        </button>
      }
    >
      {/* Mounted only while open, so the name field starts fresh. */}
      {open && <EditCharacterForm onPick={onPick} onDone={onClose} />}
    </Modal>
  )
}

function EditCharacterForm({ onPick, onDone }: { onPick: () => void; onDone: () => void }) {
  const name = useCharacter((s) => s.name)
  const setName = useCharacter((s) => s.setName)
  const url = useMediaUrl(CHARACTER_IMAGE_ID)

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDone()
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-[#120e1f]">
          {url ? (
            <img src={url} alt="目前的角色圖片" className="size-full object-contain" />
          ) : (
            <ImagePlus size={28} className="text-white/50" />
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <Button type="button" variant="secondary" size="sm" icon={<ImagePlus size={16} />} onClick={onPick}>
            {url ? '更換圖片' : '上傳圖片'}
          </Button>
          {url && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={<Trash2 size={16} />}
              onClick={() => void setCharacterImage(null)}
            >
              移除圖片
            </Button>
          )}
          <p className="text-[12px] text-ink-2">去背 PNG 效果最好，圖片只存在此裝置。</p>
        </div>
      </div>
      <FieldWrapper label="角色名稱" htmlFor="character-name">
        <TextInput
          id="character-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={(e) => !e.target.value.trim() && setName('旅人')}
          maxLength={16}
          className={clsx('bg-surface')}
        />
      </FieldWrapper>
    </form>
  )
}
