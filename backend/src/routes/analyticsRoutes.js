import express from 'express';
import { getInstitutionStats } from '../controllers/analyticsController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/:id', protect, admin, getInstitutionStats);

export default router;
