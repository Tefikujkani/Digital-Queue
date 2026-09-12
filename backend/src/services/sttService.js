const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const OPENAI_URL = 'https://api.openai.com/v1/audio/transcriptions'

function speechLanguage(lang = 'sq') {
  const code = String(lang || '').toLowerCase()
  if (code.startsWith('en')) return 'en'
  if (code.startsWith('sr')) return 'sr'
  return 'sq'
}

function filenameFor(mime = '') {
  const type = String(mime).toLowerCase()
  if (type.includes('wav') || type.includes('wave')) return 'speech.wav'
  if (type.includes('mp4')) return 'speech.mp4'
  if (type.includes('aac')) return 'speech.aac'
  if (type.includes('mpeg') || type.includes('mp3')) return 'speech.mp3'
  if (type.includes('webm')) return 'speech.webm'
  if (type.includes('ogg')) return 'speech.ogg'
  return 'speech.wav'
}

function sttConfigured() {
  return Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY)
}

async function postWhisper({ url, key, model, buffer, mime, language }) {
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mime || 'application/octet-stream' }), filenameFor(mime))
  form.append('model', model)
  form.append('language', speechLanguage(language))
  form.append('response_format', 'json')
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `STT ${response.status}`)
  }
  return String(data.text || '').trim()
}

export async function transcribeAudioBuffer(buffer, { mime, language } = {}) {
  if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) {
    throw new Error('Audio mungon')
  }
  const bytes = Buffer.from(buffer)
  if (bytes.length < 200) throw new Error('Audio shumë i shkurtër')
  if (!sttConfigured()) {
    const err = new Error('STT_NOT_CONFIGURED')
    err.code = 'STT_NOT_CONFIGURED'
    throw err
  }

  const groqKey = process.env.GROQ_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const prefer = String(process.env.STT_PROVIDER || '').toLowerCase()
  const groqModel = process.env.STT_MODEL || 'whisper-large-v3'
  const openaiModel = process.env.OPENAI_STT_MODEL || 'whisper-1'

  const attempts = []
  if (prefer === 'openai' && openaiKey) {
    attempts.push(() =>
      postWhisper({ url: OPENAI_URL, key: openaiKey, model: openaiModel, buffer: bytes, mime, language }),
    )
  }
  if (groqKey) {
    attempts.push(() =>
      postWhisper({ url: GROQ_URL, key: groqKey, model: groqModel, buffer: bytes, mime, language }),
    )
  }
  if (openaiKey && prefer !== 'openai') {
    attempts.push(() =>
      postWhisper({ url: OPENAI_URL, key: openaiKey, model: openaiModel, buffer: bytes, mime, language }),
    )
  }

  let lastError = new Error('STT dështoi')
  for (const attempt of attempts) {
    try {
      const text = await attempt()
      if (text) return text
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

export { sttConfigured }
