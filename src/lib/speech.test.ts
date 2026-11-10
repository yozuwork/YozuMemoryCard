import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

async function setup() {
  vi.resetModules()
  const synth = {
    speaking: false, pending: false, paused: false,
    cancel: vi.fn(), speak: vi.fn(), resume: vi.fn(), getVoices: () => [],
  }
  class Utterance {
    text: string
    constructor(text: string) { this.text = text }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
  vi.stubGlobal('window', { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance })
  return { synth, speech: await import('./speech') }
}

it('starts speech synchronously without cancelling an idle engine', async () => {
  const { synth, speech } = await setup()
  const done = speech.speak('hello', { rate: 1, order: ['en-US'] })
  expect(synth.cancel).not.toHaveBeenCalled()
  expect(synth.speak).toHaveBeenCalledTimes(1)
  synth.speak.mock.calls[0][0].onend()
  await done
})

it('settles cancelled playback even when Safari sends no end event', async () => {
  const { synth, speech } = await setup()
  const done = speech.speak('hello', { rate: 1, order: ['en-US'] })
  speech.stopSpeaking()
  expect(synth.cancel).toHaveBeenCalledTimes(1)
  await done
})

it('primes speech synchronously and only once per successful unlock', async () => {
  const { synth, speech } = await setup()
  speech.unlockSpeech()
  speech.unlockSpeech()
  expect(synth.speak).toHaveBeenCalledTimes(1)
  expect(synth.speak.mock.calls[0][0].volume).toBe(0)
})
