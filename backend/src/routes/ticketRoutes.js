import express from 'express'
import {
  issueTicket,
  callNextTicket,
  updateTicketStatus,
  getTickets,
  checkInTicket,
  getSlotAvailability,
} from '../controllers/ticketController.js'
import { protect, admin } from '../middlewares/authMiddleware.js'
import { ticketLimiter } from '../middlewares/rateLimiters.js'

const router = express.Router()

router.get('/', getTickets)
router.get('/slots', getSlotAvailability)
router.post('/', protect, ticketLimiter, issueTicket)
router.post('/call-next', protect, admin, callNextTicket)
router.post('/check-in', protect, admin, checkInTicket)
router.put('/:id/status', protect, updateTicketStatus)

export default router
