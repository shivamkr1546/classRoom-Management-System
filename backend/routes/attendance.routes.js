import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validation.js';
import {
    markAttendance,
    bulkMarkAttendance,
    getAttendanceBySchedule,
    getStudentAttendance,
    updateAttendance
} from '../controllers/attendance.controller.js';

const router = express.Router();

/**
 * Attendance Routes
 * Authorization: Admin/Coordinator can mark/update
 *                All authenticated users can view
 */

// Mark single attendance
// POST /api/attendance
router.post(
    '/',
    authenticate,
    authorize('admin', 'coordinator'),
    validate(schemas.attendance, 'body'),
    markAttendance
);

// Bulk mark attendance
// POST /api/attendance/bulk
router.post(
    '/bulk',
    authenticate,
    authorize('admin', 'coordinator'),
    validate(schemas.bulkAttendance, 'body'),
    bulkMarkAttendance
);

// Get attendance by schedule
// GET /api/attendance/schedule/:scheduleId
router.get(
    '/schedule/:scheduleId',
    authenticate,
    getAttendanceBySchedule
);

// Get student attendance history
// GET /api/attendance/student/:studentId?start_date=2024-01-01&end_date=2024-12-31&course_id=1
router.get(
    '/student/:studentId',
    authenticate,
    getStudentAttendance
);

// Update attendance status
// PUT /api/attendance/:id
router.put(
    '/:id',
    authenticate,
    authorize('admin', 'coordinator'),
    validate(schemas.updateAttendance, 'body'),
    updateAttendance
);

export default router;
