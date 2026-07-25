import express from 'express';
import { 
  issueTicket, 
  callNextTicket, 
  updateTicketStatus, 
  getTickets,
  simulateSMSNotification
} from '../controllers/ticketController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getTickets);
router.post('/', protect, issueTicket);
router.post('/call-next', protect, admin, callNextTicket);
router.put('/:id/status', protect, updateTicketStatus);
router.post('/simulate-sms', simulateSMSNotification);

export default router;
