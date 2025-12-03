import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validation.js';
import {
    listSchedules,
    getScheduleById,
    createSchedule,
    updateSchedule,
    cancelSchedule,
    bulkCreateSchedules
} from '../controllers/schedules.controller.js';

const router = express.Router();

/**
 * Schedule Routes
 * Authorization: Admin/Coordinator can create/update/delete
 *                All authenticated users can view
 */

// List schedules (with filters)
// GET /api/schedules?page=1&limit=10&room_id=1&course_id=2&instructor_id=3&status=confirmed&start_date=2024-01-01&end_date=2024-12-31
router.get('/', authenticate, listSchedules);

// Get schedule by ID
// GET /api/schedules/:id
router.get('/:id', authenticate, getScheduleById);

// Create new schedule
// POST /api/schedules
router.post(
    '/',
    authenticate,
    authorize('admin', 'coordinator'),
    validate(schemas.schedule, 'body'),
    createSchedule
);

// Bulk create schedules
// POST /api/schedules/bulk
router.post(
    '/bulk',
    authenticate,
    authorize('admin', 'coordinator'),
    validate(schemas.bulkSchedules, 'body'),
    bulkCreateSchedules
);

// Update schedule
// PUT /api/schedules/:id
router.put(
    '/:id',
    authenticate,
    authorize('admin', 'coordinator'),
    validate(schemas.updateSchedule, 'body'),
    updateSchedule
);

// Cancel schedule (soft delete via status)
// DELETE /api/schedules/:id
router.delete(
    '/:id',
    authenticate,
    authorize('admin', 'coordinator'),
    cancelSchedule
);

export default router;
