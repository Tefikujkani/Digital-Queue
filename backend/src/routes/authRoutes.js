import express from 'express';
import { registerUser, loginUser, getUserProfile, getAllUsers } from '../controllers/authController.js';
import { protect, superAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.get('/users', protect, superAdmin, getAllUsers);

export default router;
