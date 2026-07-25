import express from 'express'
import { protect } from '../middlewares/authMiddleware.js'
import {
  createViberLink,
  unlinkViber,
  handleViberEvent,
  getViberAccountInfo,
  getViberPublicStatus,
  isViberConfigured,
} from '../services/viberService.js'

const router = express.Router()

router.get('/status', async (_req, res) => {
  if (isViberConfigured()) {
    await getViberAccountInfo()
  }
  res.json(getViberPublicStatus())
})

router.post('/link', protect, async (req, res) => {
  try {
    const result = await createViberLink(req.user._id)
    if (!result.ok) return res.status(400).json(result)
    res.json(result)
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/unlink', protect, async (req, res) => {
  try {
    const result = await unlinkViber(req.user._id)
    res.json(result)
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

/**
 * Viber kërkon HTTPS + përgjigje 200.
 * Për conversation_started mund të kthejmë welcome message në body.
 */
router.post('/webhook', async (req, res) => {
  try {
    const welcome = await handleViberEvent(req.body)
    if (welcome) {
      return res.status(200).json(welcome)
    }
    return res.sendStatus(200)
  } catch (err) {
    console.error('Viber webhook:', err.message)
    return res.sendStatus(200)
  }
})

export default router
