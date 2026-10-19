import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Tags, Trash2 } from 'lucide-react'
import { useCards, useDecks, useTags } from '../hooks/useData'
import { deleteTag } from '../db/repo'
import { confirmDialog, toast } from '../store/ui'
import { NoteBrowser } from '../components/notes/NoteBrowser'
import { TagFormDialog } from '../components/tags/TagFormDialog'
import { TagIcon } from '../components/tags/TagIcon'
import { EmptyState } from '../components/ui/EmptyState'
import { buttonClasses } from '../components/ui/buttonStyles'

export function TagDetailPage() {
  const { tagId } = useParams<{ tagId: string }>()
  const navigate = useNavigate()
  const tags = useTags()
  const decks = useDecks()
  const allCards = useCards()
  const [editOpen, setEditOpen] = useState(false)

  const untagged = tagId === 'untagged'
  const tag = tags?.find((t) => t.id === tagId)
  const cards = useMemo(
    () => allCards?.filter((c) => (untagged ? c.tagIds.length === 0 : c.tagIds.includes(tagId ?? ''))),
    [allCards, tagId, untagged],
  )

  if (tags && !tag && !untagged) {
    return (
      <EmptyState
        icon={<Tags size={28} />}
        title="找不到這個標籤"
        action={
          <Link to="/tags" className={buttonClasses({ variant: 'secondary' })}>
            回到標籤
          </Link>
        }
        className="min-h-[60dvh]"
      />
    )
  }

  async function remove() {
    if (!tag) return
    const ok = await confirmDialog({
      title: `刪除標籤「${tag.name}」？`,
      message: '卡片會保留，只是移除這個標籤。',
      confirmLabel: '刪除標籤',
      destructive: true,
    })
    if (!ok) return
    navigate('/tags', { replace: true })
    await deleteTag(tag.id)
    toast(`已刪除標籤「${tag.name}」`)
  }

  return (
    <>
      <NoteBrowser
        cards={cards}
        decks={decks}
        tags={tags}
        back="/tags"
        title={
          <span className="flex items-center gap-3">
            <TagIcon color={tag?.color} size={30} />
            <span className="min-w-0 truncate">{untagged ? '無標籤' : (tag?.name ?? '')}</span>
          </span>
        }
        showTagFilter={false}
        menuItems={
          tag
            ? [
                { label: '編輯標籤', icon: <Pencil size={18} />, separated: true, onSelect: () => setEditOpen(true) },
                { label: '刪除標籤', icon: <Trash2 size={18} />, destructive: true, onSelect: () => void remove() },
              ]
            : []
        }
        emptyState={
          <EmptyState
            icon={<Tags size={28} />}
            title={untagged ? '所有卡片都有標籤了' : '還沒有卡片使用這個標籤'}
            description={untagged ? undefined : '在卡片編輯畫面點選標籤圖示即可加入。'}
          />
        }
      />
      {tag && (
        <TagFormDialog open={editOpen} onClose={() => setEditOpen(false)} tag={tag} existingNames={(tags ?? []).map((t) => t.name)} />
      )}
    </>
  )
}
