import express from 'express';
import {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    bulkImportStudents
} from '../controllers/students.controller.js';
import { validate, schemas } from '../middleware/validation.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/students - List all students
 * Query params: page, limit, class_label, search
 */
router.get('/', getStudents);

/**
 * GET /api/students/:id - Get student by ID
 */
router.get('/:id', getStudentById);

/**
 * POST /api/students/bulk - Bulk import students (admin/coordinator)
 * Must be before /:id route to prevent matching "bulk" as an ID
 */
router.post('/bulk', authorize('admin', 'coordinator'), validate(schemas.bulkStudents), bulkImportStudents);

/**
 * POST /api/students - Create new student (admin/coordinator)
 */
router.post('/', authorize('admin', 'coordinator'), validate(schemas.student), createStudent);

/**
 * PUT /api/students/:id - Update student (admin/coordinator)
 */
router.put('/:id', authorize('admin', 'coordinator'), validate(schemas.updateStudent), updateStudent);

/**
 * DELETE /api/students/:id - Soft delete student (admin only)
 */
router.delete('/:id', authorize('admin'), deleteStudent);

export default router;
