import express from 'express'
import { protect } from '../middlewares/authMiddleware.js'
import {
  createWhatsAppLink,
  unlinkWhatsApp,
  saveWhatsAppPhone,
  verifyWhatsAppWebhook,
  handleWhatsAppWebhook,
  getWhatsAppPublicStatus,
  saveGreenConfig,
  getGreenQr,
  getGreenState,
  getGreenAuthCode,
  sendWhatsAppMessage,
} from '../services/whatsappService.js'
import { startWaSession, getWaSessionState, stopWaSession } from '../services/waSession.js'

const router = express.Router()

router.get('/status', async (_req, res) => {
  res.json(await getWhatsAppPublicStatus())
})

router.post('/green', protect, async (req, res) => {
  try {
    const result = await saveGreenConfig(req.body || {})
    if (!result.ok) return res.status(400).json(result)
    const state = await getGreenState()
    res.json({ ...result, ...state })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.get('/green/qr', protect, async (_req, res) => {
  try {
    res.json(await getGreenQr())
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.get('/green/state', protect, async (_req, res) => {
  res.json(await getGreenState())
})

router.post('/green/code', protect, async (req, res) => {
  try {
    const result = await getGreenAuthCode(req.body?.phone)
    if (!result.ok) return res.status(400).json(result)
    res.json(result)
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/link', protect, async (req, res) => {
  try {
    const result = await createWhatsAppLink(req.user._id)
    if (!result.ok) return res.status(400).json(result)
    res.json(result)
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/session/start', protect, async (req, res) => {
  try {
    const phone = req.body?.phone || req.user.whatsappPhone || req.user.phone
    res.json({ ok: true, ...(await startWaSession(phone)) })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.get('/session', protect, async (_req, res) => {
  res.json(getWaSessionState())
})

router.post('/session/logout', protect, async (_req, res) => {
  res.json({ ok: true, ...(await stopWaSession()) })
})

router.post('/test', protect, async (req, res) => {
  const phone = req.body?.phone || req.user.whatsappPhone || req.user.phone
  if (!phone) return res.status(400).json({ ok: false, message: 'Vendos numrin e WhatsApp.' })
  const text = `✅ SmartQueue Kosova\nWhatsApp dërgon vetë.\n${req.user.name || 'Qytetar'}\nKur rezervon termin, konfirmimi të vjen këtu — s’e hap ti.`
  const sent = await sendWhatsAppMessage(phone, text)
  if (!sent.success) {
    return res.status(400).json({
      ok: false,
      sent: false,
      message: sent.error || 'Lidh WhatsApp me QR/kod një herë, pastaj provo sërish.',
    })
  }
  res.json({ ok: true, sent: true, phone, via: sent.provider })
})

router.post('/phone', protect, async (req, res) => {
  try {
    const result = await saveWhatsAppPhone(req.user._id, req.body.phone)
    if (!result.ok) return res.status(400).json(result)
    res.json(result)
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/unlink', protect, async (req, res) => {
  try {
    res.json(await unlinkWhatsApp(req.user._id))
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

/** Meta webhook verification (GET) */
router.get('/webhook', (req, res) => {
  const challenge = verifyWhatsAppWebhook(
    req.query['hub.mode'],
    req.query['hub.verify_token'],
    req.query['hub.challenge'],
  )
  if (challenge) return res.status(200).send(challenge)
  return res.sendStatus(403)
})

/** Incoming WhatsApp messages */
router.post('/webhook', async (req, res) => {
  res.sendStatus(200)
  try {
    await handleWhatsAppWebhook(req.body)
  } catch (err) {
    console.error('WhatsApp webhook:', err.message)
  }
})

export default router
