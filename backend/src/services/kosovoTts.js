import crypto from 'crypto'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { EdgeTTS } from 'node-edge-tts'

const MAX_CHARS = 1400
const cache = new Map()
const CACHE_LIMIT = 40

const VOICES = {
  sq: { voice: 'sq-AL-AnilaNeural', lang: 'sq-AL', rate: '-4%' },
  en: { voice: 'en-US-AriaNeural', lang: 'en-US', rate: '-2%' },
  sr: { voice: 'sr-RS-SophieNeural', lang: 'sr-RS', rate: '-3%' },
}

function cacheKey(text, lang) {
  return crypto.createHash('sha1').update(`${lang}:${text}`).digest('hex')
}

function remember(key, payload) {
  cache.set(key, payload)
  if (cache.size > CACHE_LIMIT) {
    const first = cache.keys().next().value
    cache.delete(first)
  }
}

function splitChunks(text, size = 180) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= size) return [clean]
  const parts = []
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

async function edgeSpeak(text, lang) {
  const cfg = VOICES[lang] || VOICES.sq
  const tts = new EdgeTTS({
    voice: cfg.voice,
    lang: cfg.lang,
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    rate: cfg.rate,
    timeout: 20000,
  })
  const file = path.join(os.tmpdir(), `sq-tts-${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`)
  try {
    const maybeBuf = await tts.ttsPromise(text, file)
    if (Buffer.isBuffer(maybeBuf) && maybeBuf.length > 80) return maybeBuf
    const buf = await fs.readFile(file)
    if (buf.length < 80) throw new Error('Edge TTS bosh')
    return buf
  } finally {
    await fs.unlink(file).catch(() => {})
  }
}

async function googleSqSpeak(text) {
  const chunks = splitChunks(text, 170)
  const buffers = []
  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=sq&q=${encodeURIComponent(chunk)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    })
    if (!res.ok) throw new Error(`Google TTS ${res.status}`)
    buffers.push(Buffer.from(await res.arrayBuffer()))
  }
  const buf = Buffer.concat(buffers)
  if (buf.length < 80) throw new Error('Google TTS bosh')
  return buf
}

export async function synthesizeSpeech(rawText, rawLang = 'sq') {
  const text = String(rawText || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS)
  if (!text) throw new Error('Teksti mungon')
  const raw = String(rawLang || 'sq').toLowerCase()
  const lang = raw.startsWith('en') ? 'en' : raw.startsWith('sr') ? 'sr' : 'sq'
  const key = cacheKey(text, lang)
  if (cache.has(key)) return cache.get(key)

  let buffer
  try {
    buffer = await edgeSpeak(text, lang)
  } catch (err) {
    if (lang !== 'sq') throw err
    buffer = await googleSqSpeak(text)
  }

  const payload = { buffer, contentType: 'audio/mpeg' }
  remember(key, payload)
  return payload
}
