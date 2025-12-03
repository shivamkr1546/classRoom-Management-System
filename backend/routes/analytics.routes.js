import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { analyticsLimiter, liveRoomsLimiter } from '../middleware/rateLimiter.js';
import {
    getSummary,
    getRoomUtilization,
    getInstructorWorkload,
    getCourseAttendance,
    getStudentAttendanceSummary
} from '../controllers/analytics.controller.js';

const router = express.Router();

/**
 * Analytics Routes
 * Rate Limiting: Applied PER-ROUTE to prevent cross-endpoint lockout
 * Authorization: All authenticated users can view analytics
 */

// Apply rate limiting BEFORE authentication (prevents DB hits from 401s)
router.use(analyticsLimiter);

// Then require authentication for all routes
router.use(authenticate);

// Get dashboard summary statistics
// GET /api/analytics/summary
router.get('/summary', getSummary);

// Get room utilization statistics
// GET /api/analytics/rooms?start_date=2024-01-01&end_date=2024-12-31&room_id=1
// Higher limit for this endpoint due to auto-refresh usage
router.get('/rooms', liveRoomsLimiter, getRoomUtilization);

// Get instructor workload statistics
// GET /api/analytics/instructors?start_date=2024-01-01&end_date=2024-12-31&instructor_id=1
router.get('/instructors', getInstructorWorkload);

// Get course attendance statistics
// GET /api/analytics/courses/:courseId/attendance?start_date=2024-01-01&end_date=2024-12-31
router.get('/courses/:courseId/attendance', getCourseAttendance);

// Get student attendance summary
// GET /api/analytics/students/:studentId/attendance?start_date=2024-01-01&end_date=2024-12-31
router.get('/students/:studentId/attendance', getStudentAttendanceSummary);

export default router;
