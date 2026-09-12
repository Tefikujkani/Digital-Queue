import api, { API_URL } from './api'
import { localVoiceIntent } from './offlineData'
import { repairVoiceTranscript, transcribeOnDevice } from './transcribeLocal'

export type VoiceGuide = {
  ok: boolean
  intent?: string
  speak: string
  institution?: {
    id: string
    name: string
    city?: string
    address?: string
    hours?: { open?: string; close?: string }
    phone?: string
    deepLink: string
  }
  service?: {
    id?: string
    name: string
    description?: string
    estimatedTime?: number
  } | null
  documents?: string[]
  when?: {
    open: boolean
    label: string
    load: string
    waiting: number
    estimatedWaitMinutes: number
    bestWindow: string
    spoken: string
  }
  actions?: { label: string; href: string }[]
  suggestions?: string[]
}

export async function fetchVoiceBriefing(params: {
  institutionId?: string
  serviceId?: string
  service?: string
  q?: string
  lang?: string
}): Promise<VoiceGuide> {
  const { data } = await api.get('/voice/briefing', { params })
  return data
}

export async function postVoiceIntent(body: {
  transcript: string
  institutionId?: string
  serviceId?: string
  language?: string
}): Promise<VoiceGuide> {
  try {
    const { data } = await api.post('/voice/intent', body)
    if (data?.ok) return data
  } catch {
    /* use on-device guide when API is unreachable */
  }
  return localVoiceIntent(body)
}

export async function transcribeAudio(blob: Blob, language = 'sq'): Promise<{ transcript: string }> {
  const token = localStorage.getItem('smartqueue_token')
  const headers: Record<string, string> = {
    'Content-Type': blob.type || 'application/octet-stream',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const urls: string[] = []
  if (import.meta.env.PROD) urls.push(`/api/voice/transcribe?language=${encodeURIComponent(language)}`)
  if (API_URL && !(import.meta.env.PROD && API_URL.includes('localhost'))) {
    urls.push(`${API_URL.replace(/\/$/, '')}/voice/transcribe?language=${encodeURIComponent(language)}`)
  }

  let lastError = new Error('transcribe failed')
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body: blob })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        lastError = new Error(data?.message || 'transcribe failed')
        continue
      }
      const transcript = repairVoiceTranscript(String(data?.transcript || ''))
      if (transcript) return { transcript }
      lastError = new Error('empty transcript')
    } catch (err) {
      lastError = err instanceof Error ? err : lastError
    }
  }

  try {
    const transcript = repairVoiceTranscript(await transcribeOnDevice(blob, language))
    if (transcript) return { transcript }
    lastError = new Error('empty transcript')
  } catch (err) {
    lastError = err instanceof Error ? err : lastError
  }
  throw lastError
}
