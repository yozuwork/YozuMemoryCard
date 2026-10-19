import { useId, useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { FieldWrapper, TextInput } from '../ui/Field'
import { ColorPicker } from '../ui/ColorPicker'
import { TagIcon } from './TagIcon'
import { createTag, updateTag } from '../../db/repo'
import { colorNames, type ColorName } from '../../lib/deckColors'
import { toast } from '../../store/ui'
import type { Tag } from '../../types/deck'

interface TagFormDialogProps {
  open: boolean
  onClose: () => void
  tag?: Tag
  existingNames: string[]
}

export function TagFormDialog({ open, onClose, tag, existingNames }: TagFormDialogProps) {
  const formId = useId()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tag ? '編輯標籤' : '新增標籤'}
      leading={
        <button type="button" onClick={onClose} className="min-h-11 px-1 text-[17px] text-tint">
          取消
        </button>
      }
      trailing={
        <button type="submit" form={formId} className="min-h-11 px-1 text-[17px] font-semibold text-tint">
          {tag ? '儲存' : '建立'}
        </button>
      }
    >
      <TagForm id={formId} tag={tag} existingNames={existingNames} onDone={onClose} />
    </Modal>
  )
}

function TagForm({ id, tag, existingNames, onDone }: { id: string; tag?: Tag; existingNames: string[]; onDone: () => void }) {
  const [name, setName] = useState(tag?.name ?? '')
  const [color, setColor] = useState<ColorName>(tag?.color ?? colorNames[existingNames.length % colorNames.length])
  const [tried, setTried] = useState(false)

  const trimmed = name.trim()
  const duplicate = existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase() && n !== tag?.name)
  const error = tried && !trimmed ? '請輸入標籤名稱' : duplicate ? '已有同名的標籤' : undefined

  async function submit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setTried(true)
    if (!trimmed || duplicate) return
    if (tag) {
      await updateTag(tag.id, { name: trimmed, color })
      toast('已更新標籤', { tone: 'success' })
    } else {
      await createTag({ name: trimmed, color })
      toast(`已建立標籤「${trimmed}」`, { tone: 'success' })
    }
    onDone()
  }

  return (
    <form id={id} onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="flex justify-center py-2">
        <TagIcon color={color} size={56} />
      </div>
      <FieldWrapper label="名稱" htmlFor="tag-name" error={error}>
        <TextInput
          id="tag-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：前端、N3、易錯"
          maxLength={30}
          data-autofocus
          aria-invalid={Boolean(error)}
          className="bg-surface"
        />
      </FieldWrapper>
      <ColorPicker value={color} onChange={setColor} label="顏色" />
    </form>
  )
}
