import express from 'express';
import { register, login, refresh, logout, revokeAllTokens, getCurrentUser } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.post('/login', validate(schemas.login, 'body'), login);
router.post('/register', authenticate, authorize('admin'), validate(schemas.register, 'body'), register);

// Protected routes
router.get('/me', authenticate, getCurrentUser);

// Token management routes
router.post('/refresh', refresh); // Exchange refresh token for new access token
router.post('/logout', logout);   // Revoke refresh token

// Admin routes
router.post('/revoke-all/:userId', authenticate, authorize('admin'), revokeAllTokens);

export default router;
