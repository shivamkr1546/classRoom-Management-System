import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validation.js';
import {
    enrollStudent,
    bulkEnrollStudents,
    unenrollStudent,
    getCourseEnrollments,
    getStudentEnrollments
} from '../controllers/enrollments.controller.js';

const router = express.Router();

/**
 * Enrollment Routes
 * Authorization: Admin/Coordinator can enroll/unenroll
 *                All authenticated users can view
 */

// Enroll single student
// POST /api/enrollments
router.post(
    '/',
    authenticate,
    authorize('admin', 'coordinator'),
    validate(schemas.enrollment, 'body'),
    enrollStudent
);

// Bulk enroll students
// POST /api/enrollments/bulk
router.post(
    '/bulk',
    authenticate,
    authorize('admin', 'coordinator'),
    validate(schemas.bulkEnrollments, 'body'),
    bulkEnrollStudents
);

// Unenroll student (soft delete)
// DELETE /api/enrollments/:id
router.delete(
    '/:id',
    authenticate,
    authorize('admin', 'coordinator'),
    unenrollStudent
);

// Get course enrollments
// GET /api/courses/:courseId/enrollments?status=active
router.get(
    '/courses/:courseId',
    authenticate,
    getCourseEnrollments
);

// Get student enrollments
// GET /api/students/:studentId/enrollments?status=active
router.get(
    '/students/:studentId',
    authenticate,
    getStudentEnrollments
);

export default router;
