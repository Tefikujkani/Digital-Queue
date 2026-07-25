import express from 'express'
import { protect } from '../middlewares/authMiddleware.js'
import {
  createTelegramLink,
  unlinkTelegram,
  handleTelegramUpdate,
  getBotInfo,
  getTelegramPublicStatus,
  isTelegramConfigured,
} from '../services/telegramService.js'

const router = express.Router()

/** Status publik i botit */
router.get('/status', async (_req, res) => {
  if (isTelegramConfigured() && !getTelegramPublicStatus().botUsername) {
    await getBotInfo()
  }
  res.json(getTelegramPublicStatus())
})

/** Deep-link për lidhjen e llogarisë */
router.post('/link', protect, async (req, res) => {
  try {
    const result = await createTelegramLink(req.user._id)
    if (!result.ok) return res.status(400).json(result)
    res.json(result)
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

/** Shkëput Telegram */
router.post('/unlink', protect, async (req, res) => {
  try {
    const result = await unlinkTelegram(req.user._id)
    res.json(result)
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

/** Webhook (prod me URL publike) */
router.post('/webhook', async (req, res) => {
  res.sendStatus(200)
  try {
    await handleTelegramUpdate(req.body)
  } catch (err) {
    console.error('Telegram webhook:', err.message)
  }
})

export default router
