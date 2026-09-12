import api, { API_URL } from './api'
import { toKosovoAccent } from './kosovoAccent'
import { getMicAudioContext } from './micSounds'
import { isIosDevice } from './pwaInstall'

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

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='

let currentAudio: HTMLAudioElement | null = null
let objectUrl: string | null = null
let primedAudio: HTMLAudioElement | null = null
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

function ttsLang(lang?: string) {
  const code = String(lang || '').toLowerCase()
  if (code.startsWith('en')) return 'en'
  if (code.startsWith('sr')) return 'sr'
  return 'sq'
}

export function getSpeechRecognition(lang?: string): BrowserSpeechRecognition | null {
  const Ctor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!Ctor) return null
  const recognition = new Ctor() as BrowserSpeechRecognition
  recognition.lang = speechLocale(lang)
  recognition.interimResults = true
  // iOS is more reliable as push-to-talk than continuous.
  recognition.continuous = !isIosDevice()
  recognition.maxAlternatives = 3
  return recognition
}

export function isSpeechRecognitionSupported() {
  return Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition,
  )
}

export function isBrowserSpeechReliable() {
  return isSpeechRecognitionSupported()
}

export function shouldUseServerStt() {
  return !isBrowserSpeechReliable()
}

function pickVoice(lang: string) {
  const voices = window.speechSynthesis?.getVoices?.() || []
  const code = lang.toLowerCase()
  const match = (prefixes: string[], names: RegExp) =>
    voices.find((v) => prefixes.some((p) => v.lang.toLowerCase().startsWith(p))) ||
    voices.find((v) => names.test(v.name)) ||
    null

  if (code.startsWith('en')) return match(['en'], /english/i)
  if (code.startsWith('sr')) return match(['sr'], /serbian|srpski/i)
  return (
    match(['sq'], /albanian|shqip|kosov/i) ||
    voices.find((v) => /google/i.test(v.name)) ||
    voices[0] ||
    null
  )
}

function splitChunks(text: string, size = 160) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= size) return [clean]
  const parts: string[] = []
  let rest = clean
  while (rest.length) {
    if (rest.length <= size) {
      parts.push(rest)
      break
    }
    let cut = rest.lastIndexOf(' ', size)
    if (cut < 40) cut = size
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  return parts.filter(Boolean)
}

function ensureAudio() {
  if (!primedAudio) {
    primedAudio = new Audio()
    primedAudio.playsInline = true
    primedAudio.setAttribute('playsinline', 'true')
    primedAudio.setAttribute('webkit-playsinline', 'true')
    primedAudio.preload = 'auto'
  }
  return primedAudio
}

export function unlockSpeechPlayback() {
  // HTMLAudio before SpeechRecognition kills the iPhone mic session.
  if (isIosDevice()) {
    void getMicAudioContext()?.resume()
    return
  }
  const audio = ensureAudio()
  audio.src = SILENT_WAV
  void audio.play().catch(() => {})
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const utter = new SpeechSynthesisUtterance(' ')
    utter.volume = 0
    synth.speak(utter)
    synth.cancel()
  } catch {
    /* ignore */
  }
}

let webSource: AudioBufferSourceNode | null = null

async function playBlobWebAudio(blob: Blob) {
  const ctx = getMicAudioContext()
  if (!ctx) throw new Error('no audio context')
  if (ctx.state === 'suspended') await ctx.resume()
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
  await new Promise<void>((resolve, reject) => {
    try {
      webSource?.stop()
    } catch {
      /* ignore */
    }
    const src = ctx.createBufferSource()
    webSource = src
    src.buffer = decoded
    src.connect(ctx.destination)
    src.onended = () => {
      setSpeaking(false)
      if (webSource === src) webSource = null
      resolve()
    }
    setSpeaking(true)
    src.start()
  })
}

function playUrl(url: string) {
  return new Promise<void>((resolve, reject) => {
    const audio = ensureAudio()
    currentAudio = audio
    audio.onplay = () => setSpeaking(true)
    audio.onended = () => {
      setSpeaking(false)
      resolve()
    }
    audio.onerror = () => reject(new Error('audio error'))
    audio.src = url
    const play = audio.play()
    if (play) play.catch(reject)
  })
}

async function googleSpeak(text: string, lang: string) {
  const tl = ttsLang(lang)
  for (const chunk of splitChunks(text)) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encodeURIComponent(chunk)}`
    await playUrl(url)
  }
}

function fallbackBrowserSpeak(text: string, lang: string) {
  if (!window.speechSynthesis || !text?.trim()) return
  const voice = pickVoice(lang)
  const locale = speechLocale(lang)
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  if (voice) {
    utter.voice = voice
    utter.lang = voice.lang || locale
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

async function fetchSpeakBlob(text: string, lang: string) {
  const body = { text, lang: ttsLang(lang) }
  const token = localStorage.getItem('smartqueue_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const urls: string[] = []
  if (import.meta.env.PROD) urls.push('/api/voice/speak')
  if (API_URL && !(import.meta.env.PROD && API_URL.includes('localhost'))) {
    urls.push(`${API_URL.replace(/\/$/, '')}/voice/speak`)
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
      if (!res.ok) continue
      const blob = await res.blob()
      if (blob.size >= 80 && !blob.type.includes('json')) return blob
    } catch {
      /* try next */
    }
  }

  try {
    const { data } = await api.post('/voice/speak', body, { responseType: 'blob' })
    if (data instanceof Blob && data.size >= 80 && !data.type.includes('json')) return data
  } catch {
    /* client fallback */
  }
  return null
}

export async function speakText(text: string, lang = 'sq-AL') {
  if (!text?.trim()) return
  stopSpeaking()
  const spoken = ttsLang(lang) === 'sq' ? toKosovoAccent(text) : text
  try {
    const blob = await fetchSpeakBlob(spoken, lang)
    if (blob) {
      if (isIosDevice()) {
        await playBlobWebAudio(blob)
        return
      }
      objectUrl = URL.createObjectURL(blob)
      await playUrl(objectUrl)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      objectUrl = null
      return
    }
    await googleSpeak(spoken, lang)
  } catch {
    fallbackBrowserSpeak(spoken, lang)
  }
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.removeAttribute('src')
    currentAudio = null
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
  try {
    webSource?.stop()
  } catch {
    /* ignore */
  }
  webSource = null
  window.speechSynthesis?.cancel()
  setSpeaking(false)
}
