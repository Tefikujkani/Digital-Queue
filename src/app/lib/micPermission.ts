import { isIosDevice, isStandaloneApp } from './pwaInstall'

export type MicPermission = 'unsupported' | 'prompt' | 'granted' | 'denied' | 'unknown'

const STORAGE_KEY = 'sq_mic_ok'

let liveStream: MediaStream | null = null

export function isSecureMicContext() {
  if (typeof window === 'undefined') return false
  return window.isSecureContext || location.hostname === 'localhost'
}

export function isMicCaptureSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

export function getLiveMicStream() {
  if (liveStream?.getAudioTracks().some((track) => track.readyState === 'live')) {
    return liveStream
  }
  return null
}

export function stopMicStream() {
  liveStream?.getTracks().forEach((track) => track.stop())
  liveStream = null
}

export async function queryMicPermission(): Promise<MicPermission> {
  if (!isMicCaptureSupported()) return 'unsupported'
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
      return status.state
    }
  } catch {
    /* Safari / iOS PWA often has no permissions.query */
  }
  if (getLiveMicStream()) return 'granted'
  return 'unknown'
}

export async function requestMicrophone(opts?: { keep?: boolean }): Promise<{
  ok: boolean
  state: MicPermission
  reason?: string
  stream?: MediaStream
}> {
  if (!isMicCaptureSupported()) {
    return { ok: false, state: 'unsupported', reason: 'unsupported' }
  }
  if (!isSecureMicContext()) {
    return { ok: false, state: 'denied', reason: 'insecure' }
  }

  const existing = getLiveMicStream()
  if (existing && opts?.keep) {
    return { ok: true, state: 'granted', stream: existing }
  }

  stopMicStream()

  try {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { autoGainControl: true, noiseSuppression: true, echoCancellation: false },
      })
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    }
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    if (opts?.keep) {
      liveStream = stream
      return { ok: true, state: 'granted', stream }
    }
    stream.getTracks().forEach((track) => track.stop())
    return { ok: true, state: 'granted' }
  } catch (err) {
    const name = (err as DOMException)?.name || ''
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return { ok: false, state: 'denied', reason: 'denied' }
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return { ok: false, state: 'denied', reason: 'no-device' }
    }
    if (name === 'NotReadableError') {
      return { ok: false, state: 'denied', reason: 'busy' }
    }
    return { ok: false, state: 'denied', reason: 'unknown' }
  }
}

export function micDeniedGuideKey() {
  if (isStandaloneApp() && isIosDevice()) return 'voice.deniedHowAppIos'
  if (isStandaloneApp()) return 'voice.deniedHowAppAndroid'
  return 'voice.deniedHow'
}
