import express from 'express'
import { optionalAuth } from '../middlewares/optionalAuth.js'
import { getVoiceBriefing, postVoiceIntent, speakVoice, transcribeVoice } from '../controllers/voiceController.js'
import { chatLimiter, voiceLimiter } from '../middlewares/rateLimiters.js'

const router = express.Router()

router.get('/briefing', optionalAuth, getVoiceBriefing)
router.post('/intent', chatLimiter, optionalAuth, postVoiceIntent)
router.post('/speak', chatLimiter, optionalAuth, speakVoice)
router.post(
  '/transcribe',
  express.raw({ type: () => true, limit: '8mb' }),
  voiceLimiter,
  optionalAuth,
  transcribeVoice,
)

export default router
