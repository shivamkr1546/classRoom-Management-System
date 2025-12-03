import { query, transaction } from '../utils/db.js';
import logger from '../utils/logger.js';

/**
 * Enrollment Controller
 * Handles course enrollment management with explicit tracking
 * Phase 4: Attendance & Analytics
 */

// Enroll a single student in a course
// POST /api/enrollments
export async function enrollStudent(req, res, next) {
    try {
        const { course_id, student_id } = req.body;
        const enrolled_by = req.user.id;

        // Verify course exists
        const [course] = await query(
            'SELECT id FROM courses WHERE id = ? AND deleted_at IS NULL',
            [course_id]
        );
        if (!course) {
            return res.status(404).json({
                error: 'NotFound',
                message: 'Course not found'
            });
        }

        // Verify student exists
        const [student] = await query(
            'SELECT id FROM students WHERE id = ? AND deleted_at IS NULL',
            [student_id]
        );
        if (!student) {
            return res.status(404).json({
                error: 'NotFound',
                message: 'Student not found'
            });
        }

        // Insert with upsert pattern (reactivate if withdrawn)
        const result = await query(`
            INSERT INTO course_enrollments (course_id, student_id, enrolled_by, status)
            VALUES (?, ?, ?, 'active')
            ON DUPLICATE KEY UPDATE
                status = 'active',
                enrolled_by = VALUES(enrolled_by),
                enrolled_at = CURRENT_TIMESTAMP
        `, [course_id, student_id, enrolled_by]);

        // Fetch the enrollment record
        const [enrollment] = await query(
            'SELECT * FROM course_enrollments WHERE course_id = ? AND student_id = ?',
            [course_id, student_id]
        );

        logger.info(`Student ${student_id} enrolled in course ${course_id} by user ${enrolled_by}`);

        res.status(201).json({
            success: true,
            message: 'Student enrolled successfully',
            data: enrollment
        });
    } catch (err) {
        next(err);
    }
}

// Bulk enroll students in a course
// POST /api/enrollments/bulk
export async function bulkEnrollStudents(req, res, next) {
    try {
        const enrollments = req.body; // Array of {course_id, student_id}
        const enrolled_by = req.user.id;

        if (!Array.isArray(enrollments) || enrollments.length === 0) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Request body must be a non-empty array of enrollments'
            });
        }

        // Use transaction for atomicity
        const result = await transaction(async (conn) => {
            const values = enrollments.map(e => [e.course_id, e.student_id, enrolled_by, 'active']);

            // Bulk insert with upsert
            const insertResult = await conn.query(`
                INSERT INTO course_enrollments (course_id, student_id, enrolled_by, status)
                VALUES ?
                ON DUPLICATE KEY UPDATE
                    status = 'active',
                    enrolled_by = VALUES(enrolled_by),
                    enrolled_at = CURRENT_TIMESTAMP
            `, [values]);

            return {
                affectedRows: insertResult.affectedRows,
                insertedCount: Math.ceil(insertResult.affectedRows / 2) // Approximate new inserts
            };
        });

        logger.info(`Bulk enrolled ${enrollments.length} students by user ${enrolled_by}`);

        res.status(201).json({
            success: true,
            message: 'Students enrolled successfully',
            data: {
                totalProcessed: enrollments.length,
                created: result.insertedCount
            }
        });
    } catch (err) {
        next(err);
    }
}

// Unenroll a student from a course (soft delete)
// DELETE /api/enrollments/:id
export async function unenrollStudent(req, res, next) {
    try {
        const { id } = req.params;

        // Check if enrollment exists
        const [enrollment] = await query(
            'SELECT * FROM course_enrollments WHERE id = ?',
            [id]
        );

        if (!enrollment) {
            return res.status(404).json({
                error: 'NotFound',
                message: 'Enrollment not found'
            });
        }

        // Soft delete by setting status to withdrawn
        await query(
            'UPDATE course_enrollments SET status = ? WHERE id = ?',
            ['withdrawn', id]
        );

        logger.info(`Student ${enrollment.student_id} unenrolled from course ${enrollment.course_id}`);

        res.status(200).json({
            success: true,
            message: 'Student unenrolled successfully'
        });
    } catch (err) {
        next(err);
    }
}

// Get all students enrolled in a course
// GET /api/courses/:courseId/enrollments
export async function getCourseEnrollments(req, res, next) {
    try {
        const { courseId } = req.params;
        const { status = 'active' } = req.query;

        let sql = `
            SELECT 
                ce.id,
                ce.course_id,
                ce.student_id,
                ce.status,
                ce.enrolled_at,
                s.roll_no,
                s.name as student_name,
                s.email as student_email,
                s.class_label,
                u.name as enrolled_by_name
            FROM course_enrollments ce
            JOIN students s ON ce.student_id = s.id
            LEFT JOIN users u ON ce.enrolled_by = u.id
            WHERE ce.course_id = ?
        `;
        const params = [courseId];

        if (status) {
            sql += ' AND ce.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY ce.enrolled_at DESC';

        const enrollments = await query(sql, params);

        res.status(200).json({
            success: true,
            data: enrollments
        });
    } catch (err) {
        next(err);
    }
}

// Get all courses a student is enrolled in
// GET /api/students/:studentId/enrollments
export async function getStudentEnrollments(req, res, next) {
    try {
        const { studentId } = req.params;
        const { status = 'active' } = req.query;

        let sql = `
            SELECT 
                ce.id,
                ce.course_id,
                ce.student_id,
                ce.status,
                ce.enrolled_at,
                c.code as course_code,
                c.name as course_name,
                c.required_capacity,
                u.name as enrolled_by_name
            FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.id
            LEFT JOIN users u ON ce.enrolled_by = u.id
            WHERE ce.student_id = ?
        `;
        const params = [studentId];

        if (status) {
            sql += ' AND ce.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY ce.enrolled_at DESC';

        const enrollments = await query(sql, params);

        res.status(200).json({
            success: true,
            data: enrollments
        });
    } catch (err) {
        next(err);
    }
}
