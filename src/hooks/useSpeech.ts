import { useCallback, useEffect, useState } from 'react'
import { hasVoiceFor, isSpeechSupported, speak, stopSpeaking } from '../lib/speech'
import { useSettings } from '../store/settings'

export function useSpeech() {
  const rate = useSettings((s) => s.speechRate)
  const order = useSettings((s) => s.languageOrder)
  const [speaking, setSpeaking] = useState(false)

  const say = useCallback(
    /** `slow` reads at 70% of the chosen rate, for sentences. */
    async (text: string, lang?: string, slow = false) => {
      setSpeaking(true)
      await speak(text, { rate: slow ? rate * 0.7 : rate, order, lang })
      setSpeaking(false)
    },
    [rate, order],
  )

  useEffect(() => () => stopSpeaking(), [])

  return { say, speaking, supported: isSpeechSupported(), stop: stopSpeaking }
}

/** Whether `lang` can be spoken; re-checked when the browser finishes loading its voices. */
export function useVoiceAvailable(lang: string): boolean {
  const [available, setAvailable] = useState(() => hasVoiceFor(lang))
  useEffect(() => {
    if (!isSpeechSupported()) return
    const check = () => setAvailable(hasVoiceFor(lang))
    window.speechSynthesis.addEventListener('voiceschanged', check)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check)
  }, [lang])
  return available
}
