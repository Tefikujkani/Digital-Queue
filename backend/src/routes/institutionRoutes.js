import express from 'express';
import { 
  getInstitutions, 
  getAllInstitutions,
  getInstitutionById, 
  createInstitution, 
  getServices,
  getCounters,
  getAnalytics,
  updateInstitutionStatus
} from '../controllers/institutionController.js';
import { protect, admin, superAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getInstitutions);
router.get('/all', protect, superAdmin, getAllInstitutions);
router.get('/:id', getInstitutionById);
router.get('/:id/services', getServices);
router.get('/:id/counters', protect, getCounters);
router.get('/:id/analytics', protect, admin, getAnalytics);
router.post('/', protect, admin, createInstitution);
router.put('/:id/status', protect, superAdmin, updateInstitutionStatus);

export default router;
