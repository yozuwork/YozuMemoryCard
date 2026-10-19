import { useId, useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { FieldWrapper, TextInput } from '../ui/Field'
import { ColorPicker } from '../ui/ColorPicker'
import { createDeck, updateDeck } from '../../db/repo'
import { colorNames, type ColorName } from '../../lib/deckColors'
import { toast } from '../../store/ui'
import type { Deck } from '../../types/deck'

interface DeckFormDialogProps {
  open: boolean
  onClose: () => void
  /** Edit this deck; omit to create a new one. */
  deck?: Deck
  existingNames: string[]
  onCreated?: (deck: Deck) => void
}

export function DeckFormDialog({ open, onClose, deck, existingNames, onCreated }: DeckFormDialogProps) {
  const formId = useId()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={deck ? '編輯牌組' : '新增牌組'}
      leading={
        <button type="button" onClick={onClose} className="min-h-11 px-1 text-[17px] text-tint">
          取消
        </button>
      }
      trailing={
        <button type="submit" form={formId} className="min-h-11 px-1 text-[17px] font-semibold text-tint">
          {deck ? '儲存' : '建立'}
        </button>
      }
    >
      {/* Mounted only while open, so the fields start fresh each time. */}
      <DeckForm id={formId} deck={deck} existingNames={existingNames} onDone={onClose} onCreated={onCreated} />
    </Modal>
  )
}

function DeckForm({
  id,
  deck,
  existingNames,
  onDone,
  onCreated,
}: {
  id: string
  deck?: Deck
  existingNames: string[]
  onDone: () => void
  onCreated?: (deck: Deck) => void
}) {
  const [name, setName] = useState(deck?.name ?? '')
  const [description, setDescription] = useState(deck?.description ?? '')
  const [color, setColor] = useState<ColorName>(deck?.color ?? colorNames[existingNames.length % colorNames.length])
  const [tried, setTried] = useState(false)

  const trimmed = name.trim()
  const duplicate = existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase() && n !== deck?.name)
  const error = tried && !trimmed ? '請輸入牌組名稱' : duplicate ? '已有同名的牌組' : undefined

  async function submit(e: FormEvent) {
    e.preventDefault()
    // React events bubble through portals; don't submit an enclosing form.
    e.stopPropagation()
    setTried(true)
    if (!trimmed || duplicate) return
    if (deck) {
      await updateDeck(deck.id, { name: trimmed, description: description.trim(), color })
      toast('已更新牌組', { tone: 'success' })
    } else {
      const created = await createDeck({ name: trimmed, description, color })
      toast(`已建立「${created.name}」`, { tone: 'success' })
      onCreated?.(created)
    }
    onDone()
  }

  return (
    <form id={id} onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FieldWrapper label="名稱" htmlFor="deck-name" error={error}>
        <TextInput
          id="deck-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：英文單字"
          maxLength={40}
          data-autofocus
          aria-invalid={Boolean(error)}
          className="bg-surface"
        />
      </FieldWrapper>
      <FieldWrapper label="描述（可選）" htmlFor="deck-desc">
        <TextInput
          id="deck-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="簡短描述這個牌組"
          maxLength={80}
          className="bg-surface"
        />
      </FieldWrapper>
      <ColorPicker value={color} onChange={setColor} label="顏色" />
    </form>
  )
}
