import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, CircleMinus, Plus, Tags } from 'lucide-react'
import { useCards, useTags } from '../hooks/useData'
import { deleteTag } from '../db/repo'
import { confirmDialog, toast } from '../store/ui'
import type { Tag } from '../types/deck'
import { PageHeader } from '../components/layout/PageHeader'
import { GlassButton } from '../components/ui/GlassButton'
import { SearchField } from '../components/ui/Field'
import { Skeleton } from '../components/ui/Controls'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { TagIcon } from '../components/tags/TagIcon'
import { TagFormDialog } from '../components/tags/TagFormDialog'

export function TagsPage() {
  const tags = useTags()
  const cards = useCards()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editTag, setEditTag] = useState<Tag>()

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    let untagged = 0
    for (const c of cards ?? []) {
      if (c.tagIds.length === 0) untagged += 1
      for (const t of c.tagIds) m.set(t, (m.get(t) ?? 0) + 1)
    }
    return { m, untagged }
  }, [cards])

  const q = query.trim().toLowerCase()
  const visible = (tags ?? []).filter((t) => t.name.toLowerCase().includes(q))
  const showUntagged = !q || '無標籤'.includes(q)

  function openCreate() {
    setEditTag(undefined)
    setFormOpen(true)
  }

  async function remove(tag: Tag) {
    const n = counts.m.get(tag.id) ?? 0
    const ok = await confirmDialog({
      title: `刪除標籤「${tag.name}」？`,
      message: n ? `${n} 張卡片會移除這個標籤，卡片本身不會被刪除。` : '沒有卡片使用這個標籤。',
      confirmLabel: '刪除標籤',
      destructive: true,
    })
    if (!ok) return
    await deleteTag(tag.id)
    toast(`已刪除標籤「${tag.name}」`)
  }

  const rowCls = 'flex min-h-[64px] flex-1 items-center gap-3 border-b border-line pr-1'

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader
        title="標籤"
        leading={
          <GlassButton onClick={() => setEditing((e) => !e)} active={editing} disabled={!tags?.length}>
            {editing ? '完成' : '編輯'}
          </GlassButton>
        }
        trailing={
          <GlassButton round aria-label="新增標籤" onClick={openCreate}>
            <Plus size={24} />
          </GlassButton>
        }
      />

      <SearchField value={query} onChange={setQuery} placeholder="搜尋" className="mb-2" />

      {!tags || !cards ? (
        <div className="mt-4 flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <ul className="mt-1" aria-label="標籤列表">
          {showUntagged && !editing && (
            <li>
              <Link to="/tags/untagged" className="flex items-center gap-4 rounded-xl pl-1 transition-colors active:bg-fill-2">
                <TagIcon size={28} />
                <span className={rowCls}>
                  <span className="flex-1 text-[17px] font-semibold text-ink">無標籤</span>
                  <span className="text-[17px] tabular-nums text-ink-2">{counts.untagged}</span>
                  <ChevronRight size={20} className="text-ink-3" aria-hidden />
                </span>
              </Link>
            </li>
          )}
          <AnimatePresence initial={false}>
            {visible.map((tag) => {
              const n = counts.m.get(tag.id) ?? 0
              const body = (
                <>
                  <TagIcon color={tag.color} size={28} />
                  <span className={rowCls}>
                    <span className="min-w-0 flex-1 truncate text-[17px] font-semibold text-ink">{tag.name}</span>
                    <span className="text-[17px] tabular-nums text-ink-2">{n}</span>
                    <ChevronRight size={20} className="text-ink-3" aria-hidden />
                  </span>
                </>
              )
              return (
                <motion.li
                  key={tag.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center overflow-hidden"
                >
                  <AnimatePresence initial={false}>
                    {editing && (
                      <motion.button
                        type="button"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 44, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        onClick={() => void remove(tag)}
                        aria-label={`刪除標籤「${tag.name}」`}
                        className="flex h-11 shrink-0 items-center justify-start text-danger"
                      >
                        <CircleMinus size={24} fill="currentColor" stroke="white" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditTag(tag)
                        setFormOpen(true)
                      }}
                      aria-label={`編輯標籤「${tag.name}」`}
                      className="flex flex-1 items-center gap-4 rounded-xl pl-1 text-left active:bg-fill-2"
                    >
                      {body}
                    </button>
                  ) : (
                    <Link to={`/tags/${tag.id}`} className="flex flex-1 items-center gap-4 rounded-xl pl-1 transition-colors active:bg-fill-2">
                      {body}
                    </Link>
                  )}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      {tags && tags.length === 0 && !q && (
        <EmptyState
          icon={<Tags size={28} />}
          title="用標籤整理跨牌組的卡片"
          description="例如「易錯」「動詞」「期中考」。一張卡片可以有多個標籤。"
          action={
            <Button variant="brand" icon={<Plus size={18} />} onClick={openCreate}>
              建立標籤
            </Button>
          }
        />
      )}
      {tags && tags.length > 0 && visible.length === 0 && !showUntagged && (
        <p className="py-12 text-center text-[15px] text-ink-2">找不到「{query}」</p>
      )}
      {editing && <p className="mt-4 px-1 text-[13px] text-ink-2">點選標籤可修改名稱與顏色；刪除標籤不會刪除卡片。</p>}

      <TagFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        tag={editTag}
        existingNames={(tags ?? []).map((t) => t.name)}
      />
    </div>
  )
}
