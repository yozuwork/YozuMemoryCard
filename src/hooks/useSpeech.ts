import { useCallback, useEffect, useState } from 'react'
import { isSpeechSupported, speak, stopSpeaking } from '../lib/speech'
import { useSettings } from '../store/settings'

export function useSpeech() {
  const rate = useSettings((s) => s.speechRate)
  const order = useSettings((s) => s.languageOrder)
  const [speaking, setSpeaking] = useState(false)

  const say = useCallback(
    async (text: string, lang?: string) => {
      setSpeaking(true)
      await speak(text, { rate, order, lang })
      setSpeaking(false)
    },
    [rate, order],
  )

  useEffect(() => () => stopSpeaking(), [])

  return { say, speaking, supported: isSpeechSupported(), stop: stopSpeaking }
}
