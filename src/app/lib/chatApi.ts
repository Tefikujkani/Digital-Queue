import api from './api'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatStreamEvent =
  | { type: 'start'; mode?: string }
  | { type: 'mode'; mode: string; model?: string; reason?: string }
  | { type: 'tool_start'; tool: string; args?: unknown }
  | { type: 'tool_end'; tool: string; ok?: boolean }
  | { type: 'delta'; content: string }
  | { type: 'done'; content: string; toolsUsed?: string[]; model?: string }
  | { type: 'error'; message: string; detail?: string }

function resolveChatUrl() {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
      ? import.meta.env.VITE_API_URL
      : 'http://localhost:5001/api'
  return `${base.replace(/\/$/, '')}/chat`
}

export async function fetchChatSuggestions(lang: string): Promise<string[]> {
  try {
    const { data } = await api.get('/chat/suggestions', { params: { lang } })
    return data.suggestions || []
  } catch {
    return [
      'Si e marr një numër digjital?',
      'Cilat institucione ka në Prishtinë?',
      'Sa është pritja tani në spital?',
      'Si rezervoj një termin?',
      'Cilat janë prioritetet e radhës?',
      'Ku i shoh ticket-et e mia?',
    ]
  }
}

/**
 * Stream chat reply via SSE from POST /api/chat
 */
export async function streamChat({
  messages,
  language,
  signal,
  onEvent,
}: {
  messages: ChatMessage[]
  language: string
  signal?: AbortSignal
  onEvent: (event: ChatStreamEvent) => void
}): Promise<void> {
  const token = localStorage.getItem('smartqueue_token')
  const res = await fetch(resolveChatUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, language, stream: true }),
    signal,
  })

  if (!res.ok) {
    let message = 'Chat request failed'
    try {
      const err = await res.json()
      message = err.message || message
    } catch {
      /* ignore */
    }
    onEvent({ type: 'error', message })
    return
  }

  if (!res.body) {
    onEvent({ type: 'error', message: 'No response body' })
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n')
    buffer = parts.pop() || ''

    for (const line of parts) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        onEvent(JSON.parse(payload) as ChatStreamEvent)
      } catch {
        /* ignore */
      }
    }
  }
}
