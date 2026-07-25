import express from 'express'
import {
  registerUser,
  loginUser,
  getUserProfile,
  getAllUsers,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
  createStaffUser,
} from '../controllers/authController.js'
import { protect, superAdmin } from '../middlewares/authMiddleware.js'
import { authLimiter } from '../middlewares/rateLimiters.js'

const router = express.Router()

router.post('/register', authLimiter, registerUser)
router.post('/login', authLimiter, loginUser)
router.post('/forgot-password', authLimiter, forgotPassword)
router.post('/reset-password', authLimiter, resetPassword)
router.get('/profile', protect, getUserProfile)
router.put('/profile', protect, updateProfile)
router.put('/password', protect, changePassword)
router.delete('/me', protect, deleteAccount)
router.get('/users', protect, superAdmin, getAllUsers)
router.post('/staff', protect, superAdmin, createStaffUser)

export default router
