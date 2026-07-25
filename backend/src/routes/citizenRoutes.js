import express from 'express'
import { protect, admin } from '../middlewares/authMiddleware.js'
import {
  createOrUpdateRating,
  getInstitutionRatings,
} from '../controllers/ratingController.js'
import {
  getPublicWaitStats,
  getBatchWaitStats,
  getCities,
} from '../controllers/publicStatsController.js'
import { getSmsProviderStatus, getFreeNotifyStatus } from '../services/smsService.js'

const router = express.Router()

router.get('/cities', getCities)
router.get('/wait-stats', getBatchWaitStats)
router.get('/wait-stats/:id', getPublicWaitStats)
router.get('/ratings/:id', getInstitutionRatings)
router.post('/ratings', protect, createOrUpdateRating)
router.get('/notify-channels', (_req, res) => {
  res.json(getFreeNotifyStatus())
})
router.get('/sms-providers', protect, admin, (_req, res) => {
  res.json(getSmsProviderStatus())
})

export default router
