import { GROK_TOOLS, executeChatTool } from './chatTools.js'
import { chatLocally } from './localAssistant.js'

const XAI_BASE = 'https://api.x.ai/v1'
const MAX_TOOL_ROUNDS = 5

function getModel() {
  return process.env.GROK_MODEL || 'grok-4-1-fast-reasoning'
}

function getApiKey() {
  const key = (process.env.XAI_API_KEY || '').trim()
  return key || null
}

export function isGrokConfigured() {
  return Boolean(getApiKey())
}

function buildSystemPrompt({ user }) {
  const userBlock = user
    ? `Përdoruesi i kyçur: ${user.name} (${user.email}), roli=${user.role}. Mund të përdorësh get_my_tickets për të.`
    : 'Vizitor (i pakyçur). Nëse pyet për ticket-et personale, kërkoji me mirësjellje të hyjë në llogari (/login).'

  return `Ti je **Asistenti SmartQueue** — udhëzues inteligjent për platformën SmartQueue Kosova (radhë digjitale dhe termine për institucione publike/private në Kosovë).

## GJUHA (E DETYRUESHME)
- Përgjigju GJITHMONË vetëm në **shqip** (standardi i Kosovës).
- Mos shkruaj anglisht, serbisht apo gjuhë të tjera — edhe nëse përdoruesi shkruan në anglisht, përgjigju në shqip.
- Emri yt: Asistenti SmartQueue.

## Misioni
Ndihmo qytetarët shpejt: gjej institucione, kupto radhën dhe kohën e pritjes, merri numrin digjital, rezervo termin, shpjego prioritetin/QR/njoftimet, dhe navigimin në aplikacion.

## Fakte për produktin
- Qytetarët shfletojnë Institucionet, marrin numra digjitalë, rezervojnë termine, ndjekin radhën live, marrin QR dhe njoftime.
- Prioritetet: normal, të moshuar, emergjencë, aftësi të kufizuara.
- Rolet: qytetar, admin (sportel), superadmin.
- Lidhje që mund t'i sugjerosh: /institutions, /appointments, /login, /register, /dashboard/citizen, /queue/:institutionId

## Mjetet (tools)
Ke mjete live për institucione, statusin e radhës, ticket-et, udhëzuesit dhe kohën më të mirë të vizitës. PËRDORI kur pyetet për institucione reale, kohë pritjeje ose ticket-e — mos invento numra.

## Stili
- I qartë, i ngrohtë, praktik. Fjali të shkurtra dhe pika kur ndihmon.
- Kur ke id të institucionit, përmend /queue/<id> që UI të bëjë deep-link.
- Mos invento fjalëkalime, çelësa API ose kredenciale admini.
- Nëse nuk je i sigurt, thuaje dhe ofro udhëzuesin ose kërkimin e institucioneve.
- Je i fuqizuar nga Grok (xAI), por prezantohu si Asistenti SmartQueue.

${userBlock}`
}

async function callGrok({ messages, stream = false, tools = GROK_TOOLS }) {
  const apiKey = getApiKey()
  if (!apiKey) {
    const err = new Error('XAI_API_KEY nuk është i konfiguruar')
    err.code = 'NO_API_KEY'
    throw err
  }

  const body = {
    model: getModel(),
    messages,
    temperature: 0.55,
    max_tokens: 1800,
  }

  if (tools?.length) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  if (stream) body.stream = true

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    let friendly = `Gabim nga Grok API (${res.status})`
    if (res.status === 401 || res.status === 403) {
      friendly = 'Çelësi XAI_API_KEY është i pavlefshëm. Kontrollo te console.x.ai'
    } else if (res.status === 429) {
      friendly = 'Kufiri i kërkesave u tejkalua. Provo pas pak.'
    } else if (res.status === 402) {
      friendly = 'Nuk ka kredi në llogarinë xAI. Shto kredi te console.x.ai'
    }
    const err = new Error(`${friendly}: ${text.slice(0, 300)}`)
    err.status = res.status
    err.code = 'GROK_API_ERROR'
    throw err
  }

  if (stream) return res
  return res.json()
}

async function chatWithGrokEngine({ messages, user = null, onEvent }) {
  const language = 'sq'
  const model = getModel()
  const conversation = [
    { role: 'system', content: buildSystemPrompt({ user }) },
    ...messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-16)
      .map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 4000) })),
  ]

  const toolsUsed = []

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const data = await callGrok({ messages: conversation, stream: false })
    const choice = data.choices?.[0]
    const msg = choice?.message
    if (!msg) throw new Error('Përgjigje e zbrazët nga Grok')

    const toolCalls = msg.tool_calls
    if (toolCalls?.length) {
      conversation.push({
        role: 'assistant',
        content: msg.content || null,
        tool_calls: toolCalls,
      })

      for (const tc of toolCalls) {
        const fnName = tc.function?.name
        let args = {}
        try {
          args = JSON.parse(tc.function?.arguments || '{}')
        } catch {
          args = {}
        }

        onEvent?.({ type: 'tool_start', tool: fnName, args })
        const result = await executeChatTool(fnName, args, { user, language })
        toolsUsed.push(fnName)
        onEvent?.({ type: 'tool_end', tool: fnName, ok: !result?.error })

        conversation.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        })
      }
      continue
    }

    if (msg.content) {
      onEvent?.({ type: 'delta', content: msg.content })
      onEvent?.({
        type: 'done',
        content: msg.content,
        toolsUsed,
        model: data.model || model,
      })
      return { content: msg.content, toolsUsed, model: data.model || model }
    }

    const streamRes = await callGrok({
      messages: [
        ...conversation,
        {
          role: 'user',
          content: 'Ju lutem përgjigju në shqip bazuar në rezultatet e mjeteve më sipër.',
        },
      ],
      stream: true,
      tools: [],
    })

    let full = ''
    const reader = streamRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') continue
        try {
          const json = JSON.parse(payload)
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            full += delta
            onEvent?.({ type: 'delta', content: delta })
          }
        } catch {
          /* ignore */
        }
      }
    }

    onEvent?.({ type: 'done', content: full, toolsUsed, model })
    return { content: full, toolsUsed, model }
  }

  throw new Error('Tejkalohen raundet e mjeteve')
}

/**
 * Përdor Grok nëse ka XAI_API_KEY; përndryshe asistentin lokal me tools live.
 * Nëse Grok dështon, bie automatikisht te lokale.
 */
export async function chatWithGrok({ messages, language = 'sq', user = null, onEvent }) {
  if (!isGrokConfigured()) {
    onEvent?.({ type: 'mode', mode: 'local' })
    return chatLocally({ messages, user, onEvent })
  }

  try {
    onEvent?.({ type: 'mode', mode: 'grok', model: getModel() })
    return await chatWithGrokEngine({ messages, user, onEvent })
  } catch (err) {
    console.warn('Grok dështoi, kaloj te asistenti lokal:', err.message)
    onEvent?.({ type: 'mode', mode: 'local_fallback', reason: err.message })
    return chatLocally({ messages, user, onEvent })
  }
}

export function getSuggestedPrompts() {
  return [
    'Si e marr një numër digjital?',
    'Cilat institucione ka në Prishtinë?',
    'Sa është pritja tani në spital?',
    'Si rezervoj një termin?',
    'Cilat janë prioritetet e radhës?',
    'Ku i shoh ticket-et e mia?',
  ]
}

export function getChatStatus() {
  return {
    configured: isGrokConfigured(),
    model: getModel(),
    mode: isGrokConfigured() ? 'grok' : 'local',
    assistant: 'Asistenti SmartQueue',
    language: 'sq',
  }
}
