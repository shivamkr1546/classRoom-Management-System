import express from 'express';
import {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    changePassword
} from '../controllers/users.controller.js';
import { validate, schemas } from '../middleware/validation.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/users - List all users (admin only)
 * Query params: page, limit, role, search
 */
router.get('/', authorize('admin'), getUsers);

/**
 * GET /api/users/:id - Get user by ID (admin or self)
 */
router.get('/:id', getUserById);

/**
 * POST /api/users - Create new user (admin only)
 */
router.post('/', authorize('admin'), validate(schemas.register), createUser);

/**
 * PUT /api/users/:id - Update user (admin only)
 */
router.put('/:id', authorize('admin'), validate(schemas.updateUser), updateUser);

/**
 * DELETE /api/users/:id - Soft delete user (admin only)
 */
router.delete('/:id', authorize('admin'), deleteUser);

/**
 * PATCH /api/users/:id/password - Change password (self or admin)
 */
router.patch('/:id/password', validate(schemas.changePassword), changePassword);

export default router;
