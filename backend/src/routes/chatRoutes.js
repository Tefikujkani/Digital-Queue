import express from 'express'
import { optionalAuth } from '../middlewares/optionalAuth.js'
import { chat, getSuggestions, getStatus } from '../controllers/chatController.js'
import { chatLimiter } from '../middlewares/rateLimiters.js'

const router = express.Router()

router.get('/suggestions', getSuggestions)
router.get('/status', getStatus)
router.post('/', chatLimiter, optionalAuth, chat)

export default router
