import express from 'express'
import { optionalAuth } from '../middlewares/optionalAuth.js'
import { getVoiceBriefing, postVoiceIntent, speakVoice } from '../controllers/voiceController.js'
import { chatLimiter } from '../middlewares/rateLimiters.js'

const router = express.Router()

router.get('/briefing', optionalAuth, getVoiceBriefing)
router.post('/intent', chatLimiter, optionalAuth, postVoiceIntent)
router.post('/speak', chatLimiter, optionalAuth, speakVoice)

export default router
