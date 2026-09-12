import { buildServiceGuide, handleVoiceIntent } from '../services/voiceGuideService.js'
import { synthesizeSpeech } from '../services/kosovoTts.js'

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
