import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { EdgeTTS } from 'node-edge-tts'

export const config = { maxDuration: 25 }

const VOICES = {
  sq: { voice: 'sq-AL-AnilaNeural', lang: 'sq-AL', rate: '-8%' },
  en: { voice: 'en-US-AriaNeural', lang: 'en-US', rate: '-4%' },
  sr: { voice: 'sr-RS-SophieNeural', lang: 'sr-RS', rate: '-6%' },
}

function ttsLang(lang) {
  const code = String(lang || '').toLowerCase()
  if (code.startsWith('en')) return 'en'
  if (code.startsWith('sr')) return 'sr'
  return 'sq'
}

function speakable(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, ' deri ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*\.\s*/g, '. ')
    .trim()
    .slice(0, 1400)
}

function splitChunks(text, size = 170) {
  const clean = speakable(text)
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
  const file = path.join(os.tmpdir(), `sq-anila-${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`)
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

async function googleSpeak(text, lang) {
  const buffers = []
  for (const chunk of splitChunks(text)) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(chunk)}`
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    })
    if (!response.ok) throw new Error(`TTS ${response.status}`)
    buffers.push(Buffer.from(await response.arrayBuffer()))
  }
  const audio = Buffer.concat(buffers)
  if (audio.length < 80) throw new Error('audio missing')
  return audio
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const lang = ttsLang(req.body?.lang)
  const text = speakable(req.body?.text)
  if (!text) return res.status(400).json({ message: 'Teksti mungon' })

  try {
    let audio
    try {
      audio = await edgeSpeak(text, lang)
    } catch {
      audio = await googleSpeak(text, lang)
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.send(audio)
  } catch (error) {
    res.status(502).json({ message: error.message || 'Zëri nuk u krijua' })
  }
}
