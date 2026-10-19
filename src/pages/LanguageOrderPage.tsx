import { Reorder, useDragControls } from 'motion/react'
import { ChevronDown, ChevronUp, GripVertical, Volume2 } from 'lucide-react'
import { useSettings } from '../store/settings'
import { useSpeech } from '../hooks/useSpeech'
import { LANGUAGES } from '../lib/speech'
import { PageHeader } from '../components/layout/PageHeader'

function LanguageItem({
  code,
  index,
  count,
  onMove,
  onTest,
  canSpeak,
}: {
  code: string
  index: number
  count: number
  onMove: (from: number, to: number) => void
  onTest: () => void
  canSpeak: boolean
}) {
  const controls = useDragControls()
  const lang = LANGUAGES.find((l) => l.code === code)
  return (
    <Reorder.Item
      value={code}
      dragListener={false}
      dragControls={controls}
      className="list-row relative flex items-center gap-1 bg-surface pl-1"
      whileDrag={{ scale: 1.02, boxShadow: 'var(--shadow-float)', zIndex: 10 }}
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        aria-hidden
        tabIndex={-1}
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-ink-3 active:cursor-grabbing"
      >
        <GripVertical size={20} />
      </button>
      <div className="list-row-body flex min-h-[58px] flex-1 items-center gap-1 pr-2">
        <span className="w-6 shrink-0 text-[15px] tabular-nums text-ink-2">{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] text-ink">{lang?.label ?? code}</span>
          <span className="block text-[12px] text-ink-2">{code}</span>
        </span>
        <button
          type="button"
          onClick={onTest}
          disabled={!canSpeak}
          aria-label={`試聽${lang?.label ?? code}`}
          className="flex size-10 items-center justify-center rounded-full text-tint hover:bg-fill-2 disabled:opacity-30"
        >
          <Volume2 size={19} />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          aria-label={`將${lang?.label ?? code}上移`}
          className="flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-fill-2 disabled:opacity-25"
        >
          <ChevronUp size={20} />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, index + 1)}
          disabled={index === count - 1}
          aria-label={`將${lang?.label ?? code}下移`}
          className="flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-fill-2 disabled:opacity-25"
        >
          <ChevronDown size={20} />
        </button>
      </div>
    </Reorder.Item>
  )
}

export function LanguageOrderPage() {
  const order = useSettings((s) => s.languageOrder)
  const set = useSettings((s) => s.set)
  const { say, supported } = useSpeech()

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length) return
    const next = [...order]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    set({ languageOrder: next })
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader title="偏好的語言順序" back="/settings" />
      <p className="mb-4 px-4 text-[14px] leading-relaxed text-ink-2">
        朗讀時會依文字判斷可能的語言，並使用清單中排序最前面的那一個。例如只含漢字的「確認」，排在前面的是中文就用中文發音，日文在前則用日文。
      </p>
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={(v) => set({ languageOrder: v })}
        className="mb-4 overflow-hidden rounded-[18px] bg-surface shadow-card"
        aria-label="語言順序"
      >
        {order.map((code, i) => {
          const lang = LANGUAGES.find((l) => l.code === code)
          return (
            <LanguageItem
              key={code}
              code={code}
              index={i}
              count={order.length}
              onMove={move}
              canSpeak={supported}
              onTest={() => void say(lang?.sample ?? 'Hello', code)}
            />
          )
        })}
      </Reorder.Group>
      <p className="px-4 text-[13px] text-ink-2">拖曳左側把手，或使用上下箭頭調整順序。實際可用的聲音取決於你的裝置與瀏覽器。</p>
    </div>
  )
}
