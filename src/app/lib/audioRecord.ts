import { getMicAudioContext } from './micSounds'

/** iOS-safe voice capture: MediaRecorder (mp4) with WAV fallback. */

export const MAX_VOICE_MS = 12000

const CAPTURE_GAIN = 10

export function canRecordAudio() {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    (typeof MediaRecorder !== 'undefined' || Boolean(window.AudioContext || (window as any).webkitAudioContext))
  )
}

export function pickRecorderMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const types = ['audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function concatFloat32(chunks: Float32Array[]) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Float32Array(length)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

export function downsample(input: Float32Array, fromRate: number, toRate: number) {
  if (fromRate === toRate) return input
  const ratio = fromRate / toRate
  const length = Math.round(input.length / ratio)
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(input.length, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end; j++) sum += input[j]
    out[i] = sum / Math.max(1, end - start)
  }
  return out
}

export function normalizePcm(samples: Float32Array, target = 0.88) {
  let peak = 0
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]))
  if (peak < 0.00015) return { samples, peak }
  const gain = Math.min(24, target / peak)
  if (gain <= 1.05) return { samples, peak }
  const out = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) out[i] = Math.max(-1, Math.min(1, samples[i] * gain))
  return { samples: out, peak }
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const bytes = samples.length * 2
  const buffer = new ArrayBuffer(44 + bytes)
  const view = new DataView(buffer)
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  write(0, 'RIFF')
  view.setUint32(4, 36 + bytes, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, bytes, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

function recordWav(
  stream: MediaStream,
  maxMs: number,
  ctx: AudioContext,
  onAutoStop?: () => void,
): { stop: () => Promise<Blob> } {
  const source = ctx.createMediaStreamSource(stream)
  const processor = ctx.createScriptProcessor(4096, 1, 1)
  const mute = ctx.createGain()
  // iOS often skips processing when gain is 0, which records silence.
  mute.gain.value = 0.002
  const chunks: Float32Array[] = []
  const startedAt = performance.now()
  let heard = false
  let silentMs = 0
  let closed = false
  processor.onaudioprocess = (event) => {
    const data = event.inputBuffer.getChannelData(0)
    const boosted = new Float32Array(data.length)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const s = Math.max(-1, Math.min(1, data[i] * CAPTURE_GAIN))
      boosted[i] = s
      sum += s * s
    }
    chunks.push(boosted)
    const rms = Math.sqrt(sum / Math.max(1, data.length))
    const sliceMs = (data.length / ctx.sampleRate) * 1000
    if (rms > 0.02) {
      heard = true
      silentMs = 0
    } else if (heard) {
      silentMs += sliceMs
      if (silentMs > 1800 && performance.now() - startedAt > 2000) void finish(true)
    }
  }
  source.connect(processor)
  processor.connect(mute)
  mute.connect(ctx.destination)
  let done: ((blob: Blob) => void) | null = null
  const finished = new Promise<Blob>((resolve) => {
    done = resolve
  })
  const timer = window.setTimeout(() => void finish(true), maxMs)

  async function finish(auto = false) {
    if (closed) return
    closed = true
    window.clearTimeout(timer)
    try {
      processor.disconnect()
      source.disconnect()
      mute.disconnect()
    } catch {
      /* already closed */
    }
    const raw = concatFloat32(chunks)
    const { samples } = normalizePcm(downsample(raw, ctx.sampleRate, 16000))
    const wav = encodeWav(samples, 16000)
    done?.(wav)
    if (auto) onAutoStop?.()
  }

  return {
    stop: () => {
      void finish(false)
      return finished
    },
  }
}

export type VoiceRecorder = {
  start: (stream: MediaStream) => Promise<void>
  stop: () => Promise<Blob>
  recording: () => boolean
}

export function createVoiceRecorder(
  maxMsOrOpts: number | { maxMs?: number; onAutoStop?: () => void } = MAX_VOICE_MS,
): VoiceRecorder {
  const maxMs = typeof maxMsOrOpts === 'number' ? maxMsOrOpts : maxMsOrOpts.maxMs || MAX_VOICE_MS
  const onAutoStop = typeof maxMsOrOpts === 'number' ? undefined : maxMsOrOpts.onAutoStop
  let media: MediaRecorder | null = null
  let wav: ReturnType<typeof recordWav> | null = null
  let chunks: Blob[] = []
  let active = false
  let timer: number | null = null
  let resolveStop: ((blob: Blob) => void) | null = null

  const finishTimer = () => {
    if (timer) window.clearTimeout(timer)
    timer = null
  }

  return {
    recording: () => active,
    async start(stream) {
      if (active) return
      active = true
      chunks = []
      const ios =
        /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      const mime = pickRecorderMime()
      if (mime && typeof MediaRecorder !== 'undefined') {
        media = new MediaRecorder(stream, { mimeType: mime })
        media.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        }
        media.onstop = () => {
          const type = media?.mimeType || mime || 'audio/mp4'
          resolveStop?.(new Blob(chunks, { type }))
          resolveStop = null
          media = null
          active = false
          finishTimer()
        }
        try {
          if (ios) media.start()
          else media.start(250)
          timer = window.setTimeout(() => onAutoStop?.(), maxMs)
          return
        } catch {
          media = null
        }
      }
      const ctx = getMicAudioContext()
      if (ctx?.state === 'suspended') await ctx.resume()
      if (!ctx) {
        active = false
        throw new Error('audio context unavailable')
      }
      wav = recordWav(stream, maxMs, ctx, onAutoStop)
    },
    async stop() {
      finishTimer()
      if (wav) {
        const blob = await wav.stop()
        wav = null
        active = false
        return blob
      }
      if (media && media.state !== 'inactive') {
        const blob = await new Promise<Blob>((resolve) => {
          resolveStop = resolve
          media?.stop()
        })
        return blob
      }
      active = false
      return new Blob(chunks, { type: pickRecorderMime() || 'audio/mp4' })
    },
  }
}

export function blobLooksSilent(blob: Blob) {
  return !blob || blob.size < 1200
}

export async function audioPeak(blob: Blob) {
  if (!blob || blob.size < 44) return 0
  const buffer = await blob.arrayBuffer()
  const view = new DataView(buffer)
  const tag = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
  if (tag !== 'RIFF' || view.byteLength < 46) return blob.size > 4000 ? 0.2 : 0
  let peak = 0
  for (let i = 44; i + 1 < view.byteLength; i += 2) {
    peak = Math.max(peak, Math.abs(view.getInt16(i, true) / 0x8000))
  }
  return peak
}
