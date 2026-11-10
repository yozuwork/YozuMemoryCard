import { create } from 'zustand'
import { db } from '../db/schema'
import { speak, stopSpeaking, unlockSpeech } from '../lib/speech'
import { backSpeech, frontSpeech } from '../lib/japaneseCard'
import { getSettings } from './settings'

/**
 * Reads a list of cards aloud (front, short pause, back) one after another —
 * the "listen through my notes" mini player.
 */
interface PlayerStore {
  queue: string[]
  index: number
  playing: boolean
  currentText: string
  start: (ids: string[], from?: number) => void
  toggle: () => void
  next: () => void
  stop: () => void
}

let runToken = 0

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const usePlayer = create<PlayerStore>()((set, get) => {
  async function run(token: number) {
    while (token === runToken) {
      const { queue, index } = get()
      if (index >= queue.length) {
        set({ playing: false, queue: [], index: 0, currentText: '' })
        return
      }
      const card = await db.cards.get(queue[index])
      if (token !== runToken) return
      if (card) {
        const { speechRate, languageOrder } = getSettings()
        const front = frontSpeech(card)
        const back = backSpeech(card)
        set({ currentText: card.front })
        await speak(front.text, { rate: speechRate, order: languageOrder, lang: front.lang })
        if (token !== runToken) return
        await wait(500)
        if (token !== runToken) return
        // A Japanese card's front and back read the same kana; once is enough.
        if (back.text !== front.text) await speak(back.text, { rate: speechRate, order: languageOrder, lang: back.lang })
        if (token !== runToken) return
        await wait(900)
      }
      if (token !== runToken) return
      set({ index: get().index + 1 })
    }
  }

  return {
    queue: [],
    index: 0,
    playing: false,
    currentText: '',
    start: (ids, from = 0) => {
      if (ids.length === 0) return
      unlockSpeech()
      const token = ++runToken
      set({ queue: ids, index: from, playing: true })
      void run(token)
    },
    toggle: () => {
      const { playing, queue } = get()
      if (queue.length === 0) return
      if (playing) {
        runToken++
        stopSpeaking()
        set({ playing: false })
      } else {
        unlockSpeech()
        const token = ++runToken
        set({ playing: true })
        void run(token)
      }
    },
    next: () => {
      const { queue, index, playing } = get()
      if (queue.length === 0) return
      runToken++
      stopSpeaking()
      set({ index: index + 1 })
      if (index + 1 >= queue.length) {
        set({ playing: false, queue: [], index: 0, currentText: '' })
        return
      }
      if (playing) {
        unlockSpeech()
        const token = ++runToken
        void run(token)
      }
    },
    stop: () => {
      runToken++
      stopSpeaking()
      set({ queue: [], index: 0, playing: false, currentText: '' })
    },
  }
})
