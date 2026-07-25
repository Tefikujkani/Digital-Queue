import express from 'express'
import { protect } from '../middlewares/authMiddleware.js'
import {
  createOrUpdateRating,
  getInstitutionRatings,
} from '../controllers/ratingController.js'
import {
  getPublicWaitStats,
  getBatchWaitStats,
  getCities,
} from '../controllers/publicStatsController.js'
import { getSmsProviderStatus } from '../services/smsService.js'

const router = express.Router()

router.get('/cities', getCities)
router.get('/wait-stats', getBatchWaitStats)
router.get('/wait-stats/:id', getPublicWaitStats)
router.get('/ratings/:id', getInstitutionRatings)
router.post('/ratings', protect, createOrUpdateRating)
router.get('/sms-providers', (_req, res) => {
  res.json(getSmsProviderStatus())
})

export default router
