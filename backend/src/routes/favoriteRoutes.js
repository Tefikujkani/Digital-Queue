import express from 'express'
import { protect } from '../middlewares/authMiddleware.js'
import {
  getFavorites,
  toggleFavorite,
  updateCitizenPrefs,
} from '../controllers/favoriteController.js'

const router = express.Router()

router.get('/', protect, getFavorites)
router.put('/prefs', protect, updateCitizenPrefs)
router.post('/:institutionId/toggle', protect, toggleFavorite)

export default router
