import type { ColorName } from '../lib/deckColors'

// Sample content written into IndexedDB on demand from Settings (see db/seed.ts).
// All cards start new.

export interface SeedCard {
  front: string
  back: string
  hint?: string
  extra?: string
  tags?: string[]
}

export interface SeedDeck {
  name: string
  description: string
  color: ColorName
  cards: SeedCard[]
}

export const seedTags: { name: string; color: ColorName }[] = [
  { name: '前端', color: 'rose' },
  { name: '名詞', color: 'lilac' },
  { name: '動詞', color: 'blue' },
]

export const seedDecks: SeedDeck[] = [
  {
    name: '英文單字',
    description: '工作與日常常用字彙',
    color: 'lilac',
    cards: [
      { front: 'confirm', back: '確認、證實', extra: 'Please confirm your attendance by Friday.', tags: ['動詞'] },
      { front: 'concat', back: '串接（concatenate 的縮寫）', extra: "'a'.concat('b') → 'ab'", tags: ['前端', '動詞'] },
      { front: 'temporary', back: '暫時的、臨時的', hint: '常縮寫為 temp', extra: 'a temporary file 暫存檔' },
      { front: 'deadline', back: '截止期限', extra: 'We are working to a tight deadline.', tags: ['名詞'] },
      { front: 'negotiate', back: '協商、談判', extra: 'We need to negotiate a better price.', tags: ['動詞'] },
    ],
  },
  {
    name: 'React 面試題',
    description: 'React / 前端常見面試問題整理',
    color: 'blue',
    cards: [
      { front: 'useEffect 的第二個參數是什麼？', back: '依賴陣列（dependency array），決定 effect 何時重新執行。', extra: 'useEffect(() => { fetchUser(id) }, [id])', tags: ['前端'] },
      { front: 'React 的 key 屬性有什麼用途？', back: '幫助 React 在重新渲染列表時識別哪些元素改變、新增或移除。', extra: 'items.map((item) => <li key={item.id}>{item.name}</li>)', tags: ['前端'] },
      { front: '什麼是 Virtual DOM？', back: '記憶體中的 UI 樹狀表示，React 用它來比對差異並最小化真實 DOM 操作。', extra: 'setState 後 React 先比對新舊 Virtual DOM，只更新有變動的節點。', tags: ['前端'] },
      { front: 'useMemo 與 useCallback 的差異？', back: 'useMemo 快取計算結果，useCallback 快取函式本身。', extra: 'const total = useMemo(() => sum(items), [items])', tags: ['前端'] },
    ],
  },
  {
    name: '日文 N3 單字',
    description: '日檢 N3 核心單字',
    color: 'rose',
    cards: [
      { front: '経験', back: 'けいけん — 經驗', extra: '日本で働いた経験があります。（有在日本工作的經驗。）', tags: ['名詞'] },
      { front: '確認する', back: 'かくにんする — 確認', extra: 'メールを確認してください。（請確認郵件。）', tags: ['動詞'] },
      { front: '苦手', back: 'にがて — 不擅長、棘手', extra: '辛い料理は苦手です。（我不太敢吃辣。）' },
      { front: '相談', back: 'そうだん — 商量、諮詢', extra: '先生に相談しました。（跟老師商量過了。）', tags: ['名詞'] },
    ],
  },
]
