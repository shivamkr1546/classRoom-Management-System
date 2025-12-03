import express from 'express';
import {
    getCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    assignInstructor,
    unassignInstructor
} from '../controllers/courses.controller.js';
import { validate, schemas } from '../middleware/validation.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/courses - List all courses
 * Query params: page, limit, search
 */
router.get('/', getCourses);

/**
 * GET /api/courses/:id - Get course by ID with instructors
 */
router.get('/:id', getCourseById);

/**
 * POST /api/courses - Create new course (admin/coordinator)
 */
router.post('/', authorize('admin', 'coordinator'), validate(schemas.course), createCourse);

/**
 * PUT /api/courses/:id - Update course (admin/coordinator/instructor-owned)
 * Instructor can only update courses they teach
 */
router.put('/:id', authorize('admin', 'coordinator', 'instructor'), validate(schemas.updateCourse), updateCourse);

/**
 * DELETE /api/courses/:id - Soft delete course (admin only)
 */
router.delete('/:id', authorize('admin'), deleteCourse);

/**
 * POST /api/courses/:id/instructors/:instructorId - Assign instructor (admin/coordinator)
 */
router.post('/:id/instructors/:instructorId', authorize('admin', 'coordinator'), assignInstructor);

/**
 * DELETE /api/courses/:id/instructors/:instructorId - Unassign instructor (admin/coordinator)
 */
router.delete('/:id/instructors/:instructorId', authorize('admin', 'coordinator'), unassignInstructor);

export default router;
