/** On-device Whisper when the server has no STT key (iPhone / PWA). */

import { getMicAudioContext } from './micSounds'
import { downsample, normalizePcm } from './audioRecord'

type WhisperInput = { audio: Float32Array; sampling_rate: number }

let transcriberPromise: Promise<(audio: WhisperInput, opts: Record<string, unknown>) => Promise<any>> | null =
  null
let warm = false

export function isLocalSttWarm() {
  return warm
}

function whisperLanguage(language: string) {
  const code = String(language || '').toLowerCase()
  if (code.startsWith('en')) return 'english'
  if (code.startsWith('sr')) return 'serbian'
  return 'albanian'
}

export function repairVoiceTranscript(text: string) {
  let out = String(text || '').replace(/\s+/g, ' ').trim()
  const swaps: [RegExp, string][] = [
    [/\b(id card|identity card|letter njoftim|leter njoftim|letarnjoftim|later njoftim)\b/gi, 'letërnjoftim'],
    [/\b(passport|passaport|pashaport|pasa porta)\b/gi, 'pasaportë'],
    [/\b(birth certificate|certificate of birth|certificat.*lind)\b/gi, 'certifikatë lindjeje'],
    [/\b(marriage certificate|certificat.*mart)\b/gi, 'certifikatë martese'],
    [/\b(documents?|dokument)\b/gi, 'dokumente'],
    [/\b(appointment|terminate?|booking)\b/gi, 'termin'],
    [/\b(queue|ticket number|take a number)\b/gi, 'numër'],
    [/\b(prishtina|pristina|pristine)\b/gi, 'Prishtinë'],
  ]
  for (const [from, to] of swaps) out = out.replace(from, to)
  return out.replace(/^[\s.,;:!?…-]+|[\s.,;:!?…-]+$/g, '').trim()
}

function usableTranscript(text: string) {
  const clean = repairVoiceTranscript(text)
  if (clean.length < 2) return ''
  if (/^[.·•…]+$/.test(clean)) return ''
  return clean
}

async function wavToPcm(blob: Blob) {
  const buffer = await blob.arrayBuffer()
  if (buffer.byteLength < 44) return null
  const view = new DataView(buffer)
  const header = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
  if (header !== 'RIFF') return null
  let offset = 12
  let sampling_rate = 16000
  let dataOffset = -1
  let dataBytes = 0
  while (offset + 8 <= view.byteLength) {
    const id = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    )
    const size = view.getUint32(offset + 4, true)
    if (id === 'fmt ') sampling_rate = view.getUint32(offset + 12, true)
    if (id === 'data') {
      dataOffset = offset + 8
      dataBytes = size
      break
    }
    offset += 8 + size
  }
  if (dataOffset < 0) {
    dataOffset = 44
    dataBytes = view.byteLength - 44
  }
  const samples = new Float32Array(Math.floor(dataBytes / 2))
  for (let i = 0; i < samples.length; i++) {
    samples[i] = view.getInt16(dataOffset + i * 2, true) / 0x8000
  }
  return { audio: samples, sampling_rate }
}

async function decodeBlobPcm(blob: Blob): Promise<WhisperInput | null> {
  const wav = await wavToPcm(blob).catch(() => null)
  if (wav && wav.audio.length > 1600) {
    const { samples } = normalizePcm(wav.audio)
    return { audio: samples, sampling_rate: wav.sampling_rate || 16000 }
  }
  try {
    const ctx = getMicAudioContext()
    if (!ctx) return wav ? { audio: normalizePcm(wav.audio).samples, sampling_rate: wav.sampling_rate } : null
    const decoded = await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0))
    const channel = decoded.getChannelData(0)
    const down = downsample(channel, decoded.sampleRate, 16000)
    return { audio: normalizePcm(down).samples, sampling_rate: 16000 }
  } catch {
    return wav
  }
}

async function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = import('@huggingface/transformers')
      .then(({ pipeline, env }) => {
        env.allowLocalModels = false
        env.useBrowserCache = true
        try {
          env.backends.onnx.wasm.numThreads = 1
          env.backends.onnx.wasm.proxy = false
        } catch {
          /* older runtimes */
        }
        return pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
          dtype: 'q8',
        })
      })
      .catch((err) => {
        transcriberPromise = null
        throw err
      })
  }
  return transcriberPromise
}

export function preloadLocalStt() {
  void getTranscriber().catch(() => {})
}

function pickText(out: any) {
  const text = Array.isArray(out) ? out[0]?.text : out?.text
  return usableTranscript(String(text || ''))
}

export async function transcribeOnDevice(blob: Blob, language = 'sq'): Promise<string> {
  const pcm = await decodeBlobPcm(blob)
  if (!pcm || pcm.audio.length < 1600) throw new Error('empty transcript')
  let peak = 0
  for (let i = 0; i < pcm.audio.length; i++) peak = Math.max(peak, Math.abs(pcm.audio[i]))
  if (peak < 0.01) throw new Error('empty transcript')

  const transcriber = await getTranscriber()
  const lang = whisperLanguage(language)
  const attempts: Record<string, unknown>[] = [
    { task: 'transcribe' },
    { language: lang, task: 'transcribe' },
  ]
  if (lang !== 'english') attempts.push({ language: 'english', task: 'transcribe' })

  let last = ''
  for (const opts of attempts) {
    try {
      const text = pickText(await transcriber(pcm, opts))
      if (text) {
        warm = true
        return text
      }
      last = text
    } catch {
      /* try next language */
    }
  }
  warm = true
  return last
}
