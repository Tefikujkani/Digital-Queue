import api from './api'
import { localVoiceIntent } from './offlineData'

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
