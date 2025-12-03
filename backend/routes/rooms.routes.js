import express from 'express';
import {
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom
} from '../controllers/rooms.controller.js';
import { validate, schemas } from '../middleware/validation.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/rooms - List all rooms
 * Query params: page, limit, type, search
 */
router.get('/', getRooms);

/**
 * GET /api/rooms/:id - Get room by ID
 */
router.get('/:id', getRoomById);

/**
 * POST /api/rooms - Create new room (admin/coordinator)
 */
router.post('/', authorize('admin', 'coordinator'), validate(schemas.room), createRoom);

/**
 * PUT /api/rooms/:id - Update room (admin/coordinator)
 */
router.put('/:id', authorize('admin', 'coordinator'), validate(schemas.updateRoom), updateRoom);

/**
 * DELETE /api/rooms/:id - Soft delete room (admin only)
 */
router.delete('/:id', authorize('admin'), deleteRoom);

export default router;
