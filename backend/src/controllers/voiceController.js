import { buildServiceGuide, handleVoiceIntent } from '../services/voiceGuideService.js'
import { synthesizeSpeech } from '../services/kosovoTts.js'
import { transcribeAudioBuffer } from '../services/sttService.js'

export const speakVoice = async (req, res) => {
  try {
    const text = String(req.body?.text || req.query.text || '')
    const lang = req.body?.lang || req.query.lang || 'sq'
    const { buffer, contentType } = await synthesizeSpeech(text, lang)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
  } catch (error) {
    res.status(502).json({ message: error.message || 'Zëri nuk u krijua' })
  }
}

export const getVoiceBriefing = async (req, res) => {
  try {
    const guide = await buildServiceGuide({
      institutionId: req.query.institutionId,
      serviceId: req.query.serviceId,
      serviceName: req.query.service,
      name: req.query.name,
      transcript: req.query.q || '',
      language: req.query.lang || 'sq',
    })
    res.json(guide)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const transcribeVoice = async (req, res) => {
  try {
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || [])
    const mime = String(req.headers['content-type'] || 'application/octet-stream')
    const language = req.query.language || req.headers['x-speech-language'] || 'sq'
    const transcript = await transcribeAudioBuffer(buffer, { mime, language })
    if (!transcript) {
      return res.status(422).json({ message: 'Nuk e dallova zërin. Flisni më qartë.' })
    }
    res.json({ transcript })
  } catch (error) {
    if (error.code === 'STT_NOT_CONFIGURED' || error.message === 'STT_NOT_CONFIGURED') {
      return res.status(503).json({ message: 'Transkriptimi i zërit nuk është i gatshëm.' })
    }
    if (error.message === 'Audio shumë i shkurtër' || error.message === 'Audio mungon') {
      return res.status(422).json({ message: error.message })
    }
    res.status(502).json({ message: error.message || 'Zëri nuk u transkriptua' })
  }
}

export const postVoiceIntent = async (req, res) => {
  try {
    const { transcript, institutionId, serviceId, language } = req.body || {}
    const guide = await handleVoiceIntent({
      transcript,
      institutionId,
      serviceId,
      language: language || 'sq',
    })
    res.json(guide)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
