import express from 'express';
import { register, login } from '../controllers/auth.controller.js';
import { validate, schemas } from '../middleware/validation.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route - Login
router.post('/login', validate(schemas.login), login);

// Protected route - Register (admin only)
router.post('/register', authenticate, authorize('admin'), validate(schemas.register), register);

export default router;
