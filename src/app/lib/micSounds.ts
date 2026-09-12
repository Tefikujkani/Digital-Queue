/** Short UI tones for mic start / stop / allow / deny. Uses Web Audio — no files. */

let ctx: AudioContext | null = null

function audio() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as any).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone({
  from,
  to,
  duration,
  volume = 0.09,
  type = 'sine',
  delay = 0,
}: {
  from: number
  to?: number
  duration: number
  volume?: number
  type?: OscillatorType
  delay?: number
}) {
  const c = audio()
  if (!c) return
  const start = c.currentTime + delay
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.018)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(start)
  osc.stop(start + duration + 0.03)
}

export function getMicAudioContext() {
  return audio()
}

export function unlockMicAudio() {
  audio()
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (ios) return
  try {
    const silent = new Audio(
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=',
    )
    silent.playsInline = true
    silent.setAttribute('playsinline', 'true')
    void silent.play().catch(() => {})
  } catch {
    /* ignore */
  }
}

export function playMicStart() {
  tone({ from: 640, to: 920, duration: 0.13, volume: 0.1 })
}

export function playMicStop() {
  tone({ from: 480, to: 280, duration: 0.12, volume: 0.07 })
}

export function playMicGranted() {
  tone({ from: 523, duration: 0.09, volume: 0.08 })
  tone({ from: 784, duration: 0.16, volume: 0.1, delay: 0.09 })
}

export function playMicDenied() {
  tone({ from: 240, to: 150, duration: 0.22, volume: 0.1, type: 'triangle' })
}

export function playMicHeard() {
  tone({ from: 880, to: 1180, duration: 0.08, volume: 0.06 })
}
