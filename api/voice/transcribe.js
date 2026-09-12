export const config = {
  api: { bodyParser: false },
}

function speechLanguage(lang = 'sq') {
  const code = String(lang || '').toLowerCase()
  if (code.startsWith('en')) return 'en'
  if (code.startsWith('sr')) return 'sr'
  return 'sq'
}

function filenameFor(mime = '') {
  const type = String(mime).toLowerCase()
  if (type.includes('wav')) return 'speech.wav'
  if (type.includes('mp4')) return 'speech.mp4'
  if (type.includes('webm')) return 'speech.webm'
  if (type.includes('mpeg') || type.includes('mp3')) return 'speech.mp3'
  return 'speech.wav'
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function whisper(url, key, model, buffer, mime, language) {
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
  if (!response.ok) throw new Error(data?.error?.message || data?.message || `STT ${response.status}`)
  return String(data.text || '').trim()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Speech-Language')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const groqKey = process.env.GROQ_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (!groqKey && !openaiKey) {
    return res.status(503).json({ message: 'Transkriptimi i zërit nuk është i gatshëm.' })
  }

  try {
    const buffer = await readBody(req)
    if (!buffer || buffer.length < 200) {
      return res.status(422).json({ message: 'Audio shumë i shkurtër' })
    }
    const mime = String(req.headers['content-type'] || 'application/octet-stream')
    const language = req.query?.language || req.headers['x-speech-language'] || 'sq'
    let transcript = ''
    if (groqKey) {
      transcript = await whisper(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        groqKey,
        process.env.STT_MODEL || 'whisper-large-v3',
        buffer,
        mime,
        language,
      )
    } else {
      transcript = await whisper(
        'https://api.openai.com/v1/audio/transcriptions',
        openaiKey,
        'whisper-1',
        buffer,
        mime,
        language,
      )
    }
    if (!transcript) return res.status(422).json({ message: 'Nuk e dallova zërin. Flisni më qartë.' })
    res.json({ transcript })
  } catch (error) {
    res.status(502).json({ message: error.message || 'Zëri nuk u transkriptua' })
  }
}
