import api from './api'

type BrowserSpeechRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

type SpeakListener = (speaking: boolean) => void

let currentAudio: HTMLAudioElement | null = null
let objectUrl: string | null = null
const speakListeners = new Set<SpeakListener>()

function setSpeaking(speaking: boolean) {
  speakListeners.forEach((fn) => fn(speaking))
}

export function onSpeakState(fn: SpeakListener) {
  speakListeners.add(fn)
  return () => speakListeners.delete(fn)
}

export function speechLocale(lang?: string) {
  const code = String(lang || '').toLowerCase()
  if (code.startsWith('en')) return 'en-US'
  if (code.startsWith('sr')) return 'sr-RS'
  return 'sq-AL'
}

export function getSpeechRecognition(lang?: string): BrowserSpeechRecognition | null {
  const Ctor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!Ctor) return null
  const recognition = new Ctor() as BrowserSpeechRecognition
  recognition.lang = speechLocale(lang)
  recognition.interimResults = true
  recognition.continuous = false
  recognition.maxAlternatives = 1
  return recognition
}

export function isSpeechRecognitionSupported() {
  return Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition,
  )
}

function pickVoice(lang: string) {
  const voices = window.speechSynthesis?.getVoices?.() || []
  const code = lang.toLowerCase()
  if (code.startsWith('en')) {
    return (
      voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
      voices.find((v) => /english/i.test(v.name)) ||
      null
    )
  }
  if (code.startsWith('sr')) {
    return (
      voices.find((v) => v.lang.toLowerCase().startsWith('sr')) ||
      voices.find((v) => /serbian|srpski/i.test(v.name)) ||
      null
    )
  }
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith('sq')) ||
    voices.find((v) => /albanian|shqip|kosov/i.test(v.name)) ||
    null
  )
}

function fallbackBrowserSpeak(text: string, lang: string) {
  if (!window.speechSynthesis || !text?.trim()) return
  const voice = pickVoice(lang)
  const locale = speechLocale(lang)
  if (!voice && locale === 'sq-AL') return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  if (voice) {
    utter.voice = voice
    utter.lang = voice.lang
  } else {
    utter.lang = locale
  }
  utter.rate = 0.94
  utter.pitch = 1
  utter.onstart = () => setSpeaking(true)
  utter.onend = () => setSpeaking(false)
  utter.onerror = () => setSpeaking(false)
  window.speechSynthesis.speak(utter)
}

export async function speakText(text: string, lang = 'sq-AL') {
  if (!text?.trim()) return
  stopSpeaking()
  try {
    const { data } = await api.post(
      '/voice/speak',
      {
        text,
        lang: lang.toLowerCase().startsWith('en')
          ? 'en'
          : lang.toLowerCase().startsWith('sr')
            ? 'sr'
            : 'sq',
      },
      { responseType: 'blob' },
    )
    if (!(data instanceof Blob) || data.size < 80 || data.type.includes('json')) {
      throw new Error('audio missing')
    }
    objectUrl = URL.createObjectURL(data)
    currentAudio = new Audio(objectUrl)
    currentAudio.onplay = () => setSpeaking(true)
    currentAudio.onended = () => {
      setSpeaking(false)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      objectUrl = null
      currentAudio = null
    }
    currentAudio.onerror = () => {
      setSpeaking(false)
      stopSpeaking()
    }
    await currentAudio.play()
  } catch {
    fallbackBrowserSpeak(text, lang)
  }
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
  window.speechSynthesis?.cancel()
  setSpeaking(false)
}
