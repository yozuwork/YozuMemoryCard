import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ImagePlus, RotateCcw } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { FieldWrapper, TextInput } from '../ui/Field'
import { ColorPicker } from '../ui/ColorPicker'
import { Button } from '../ui/Button'
import { DeckCover } from './DeckCover'
import { createDeck, setDeckCover, updateDeck } from '../../db/repo'
import { prepareImage } from '../../lib/image'
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
  /** `Blob` = new upload, `null` = back to the default cover, `undefined` = unchanged. */
  const [cover, setCover] = useState<Blob | null>()
  const coverUrl = useObjectUrl(cover ?? undefined)
  const fileRef = useRef<HTMLInputElement>(null)

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
      if (cover !== undefined) await setDeckCover(deck.id, cover)
      toast('已更新牌組', { tone: 'success' })
    } else {
      const created = await createDeck({ name: trimmed, description, color })
      if (cover) await setDeckCover(created.id, cover)
      toast(`已建立「${created.name}」`, { tone: 'success' })
      onCreated?.(created)
    }
    onDone()
  }

  async function pick(file: File | undefined) {
    if (!file) return
    try {
      setCover(await prepareImage(file))
    } catch (e) {
      toast(e instanceof Error ? e.message : '無法讀取圖片', { tone: 'error' })
    }
  }

  const hasCustom = cover === undefined ? Boolean(deck?.coverImage) : cover !== null

  return (
    <form id={id} onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div>
        <p className="mb-1.5 px-1 text-[13px] font-medium text-ink-2">封面</p>
        <DeckCover
          deck={{ name: trimmed || '牌組', color, packKey: deck?.packKey, coverImage: cover === null ? undefined : deck?.coverImage }}
          previewUrl={coverUrl}
          className="aspect-[16/7] w-full rounded-[18px]"
        />
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" icon={<ImagePlus size={16} />} onClick={() => fileRef.current?.click()}>
            {hasCustom ? '更換封面' : '上傳封面'}
          </Button>
          {hasCustom && (
            <Button type="button" variant="ghost" size="sm" icon={<RotateCcw size={16} />} onClick={() => setCover(null)}>
              使用預設封面
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          tabIndex={-1}
          onChange={(e) => {
            void pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
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

function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}
