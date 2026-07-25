import express from 'express'
import { protect } from '../middlewares/authMiddleware.js'
import {
  createWhatsAppLink,
  unlinkWhatsApp,
  saveWhatsAppPhone,
  verifyWhatsAppWebhook,
  handleWhatsAppWebhook,
  getWhatsAppPublicStatus,
  isWhatsAppConfigured,
} from '../services/whatsappService.js'

const router = express.Router()

router.get('/status', (_req, res) => {
  res.json(getWhatsAppPublicStatus())
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

/** Ruaj numrin WhatsApp manualisht (funksionon edhe pa webhook) */
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
