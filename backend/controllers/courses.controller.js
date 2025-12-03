import { query, queryOne, paginate, buildPaginationMeta, transaction } from '../utils/db.js';
import { sendSuccess, sendPaginatedResponse, sendError } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Check if instructor owns/teaches a course
 */
async function isInstructorOfCourse(courseId, instructorId) {
    const result = await queryOne(
        'SELECT 1 FROM course_instructors WHERE course_id = ? AND instructor_id = ? LIMIT 1',
        [courseId, instructorId]
    );
    return !!result;
}

/**
 * Get all courses with pagination and search
 * GET /api/courses?page=1&limit=10&search=math
 */
export async function getCourses(req, res, next) {
    try {
        const { page, limit, offset } = paginate(req.query.page, req.query.limit);
        const { search } = req.query;

        // Build WHERE clause
        const conditions = ['deleted_at IS NULL'];
        const params = [];

        if (search) {
            conditions.push('(name LIKE ? OR code LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM courses ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get paginated courses
        const courses = await query(
            `SELECT id, code, name, required_capacity, created_at, updated_at 
             FROM courses 
             ${whereClause}
             ORDER BY code ASC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const pagination = buildPaginationMeta(total, page, limit);

        return sendPaginatedResponse(res, courses, pagination);
    } catch (error) {
        next(error);
    }
}

/**
 * Get single course by ID with assigned instructors
 * GET /api/courses/:id
 */
export async function getCourseById(req, res, next) {
    try {
        const { id } = req.params;

        const course = await queryOne(
            'SELECT id, code, name, required_capacity, created_at, updated_at FROM courses WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!course) {
            return sendError(res, 404, 'NotFound', 'Course not found');
        }

        // Get assigned instructors
        const instructors = await query(
            `SELECT u.id, u.name, u.email 
             FROM course_instructors ci 
             JOIN users u ON ci.instructor_id = u.id 
             WHERE ci.course_id = ? AND u.deleted_at IS NULL`,
            [id]
        );

        course.instructors = instructors;

        return sendSuccess(res, 200, course);
    } catch (error) {
        next(error);
    }
}

/**
 * Create new course (admin/coordinator)
 * POST /api/courses
 */
export async function createCourse(req, res, next) {
    try {
        const { code, name, required_capacity } = req.body;

        // Allow restoring previously deleted courses to support repeat test runs
        const existingCourse = await queryOne(
            'SELECT id, deleted_at FROM courses WHERE code = ? LIMIT 1',
            [code]
        );

        if (existingCourse) {
            if (existingCourse.deleted_at) {
                await query(
                    `UPDATE courses
                     SET name = ?, required_capacity = ?, deleted_at = NULL, deleted_by = NULL, updated_by = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [name, required_capacity || 0, req.user.id, existingCourse.id]
                );

                const restored = await queryOne(
                    'SELECT id, code, name, required_capacity, created_at, updated_at FROM courses WHERE id = ?',
                    [existingCourse.id]
                );

                logger.info(`Course restored: ${code} by user ${req.user.id}`);

                return sendSuccess(res, 201, restored, 'Course restored successfully');
            }

            return sendError(res, 409, 'Conflict', 'Course code already exists');
        }

        // Insert course
        const result = await query(
            'INSERT INTO courses (code, name, required_capacity, created_by) VALUES (?, ?, ?, ?)',
            [code, name, required_capacity || 0, req.user.id]
        );

        // Get created course
        const course = await queryOne(
            'SELECT id, code, name, required_capacity, created_at FROM courses WHERE id = ?',
            [result.insertId]
        );

        logger.info(`Course created: ${code} by user ${req.user.id}`);

        return sendSuccess(res, 201, course, 'Course created successfully');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return sendError(res, 409, 'Conflict', 'Course code already exists');
        }
        next(error);
    }
}

/**
 * Update course (admin/coordinator or instructor if owns course)
 * PUT /api/courses/:id
 */
export async function updateCourse(req, res, next) {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Check if course exists
        const existingCourse = await queryOne(
            'SELECT id FROM courses WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!existingCourse) {
            return sendError(res, 404, 'NotFound', 'Course not found');
        }

        // If instructor, check ownership
        if (req.user.role === 'instructor') {
            const isOwner = await isInstructorOfCourse(id, req.user.id);
            if (!isOwner) {
                return sendError(res, 403, 'Forbidden', 'You can only update courses you teach');
            }
        }

        // Build update query
        const fields = [];
        const values = [];

        if (updates.code) {
            fields.push('code = ?');
            values.push(updates.code);
        }
        if (updates.name) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.required_capacity !== undefined) {
            fields.push('required_capacity = ?');
            values.push(updates.required_capacity);
        }

        // Add audit fields
        fields.push('updated_by = ?');
        values.push(req.user.id);

        // Execute update
        await query(
            `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`,
            [...values, id]
        );

        // Get updated course
        const course = await queryOne(
            'SELECT id, code, name, required_capacity, created_at, updated_at FROM courses WHERE id = ?',
            [id]
        );

        logger.info(`Course updated: ${id} by user ${req.user.id}`);

        return sendSuccess(res, 200, course, 'Course updated successfully');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return sendError(res, 409, 'Conflict', 'Course code already exists');
        }
        next(error);
    }
}

/**
 * Delete course (soft delete, admin only)
 * DELETE /api/courses/:id
 */
export async function deleteCourse(req, res, next) {
    try {
        const { id } = req.params;

        // Check if course exists
        const course = await queryOne(
            'SELECT id, code FROM courses WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!course) {
            return sendError(res, 404, 'NotFound', 'Course not found');
        }

        // Check for future schedules
        const schedules = await query(
            'SELECT COUNT(*) as count FROM schedules WHERE course_id = ? AND date >= CURDATE() AND status = ?',
            [id, 'confirmed']
        );

        if (schedules[0].count > 0) {
            return sendError(
                res,
                409,
                'Conflict',
                'Cannot delete course with future schedules',
                { futureSchedules: schedules[0].count }
            );
        }

        await transaction(async (conn) => {
            await conn.query('DELETE FROM course_instructors WHERE course_id = ?', [id]);
            await conn.query(
                'UPDATE courses SET deleted_at = NOW(), deleted_by = ?, updated_by = ? WHERE id = ?',
                [req.user.id, req.user.id, id]
            );
        });

        logger.info(`Course soft-deleted: ${course.code} (${id}) by user ${req.user.id}`);

        return sendSuccess(res, 200, null, 'Course deleted successfully');
    } catch (error) {
        next(error);
    }
}

/**
 * Assign instructor to course (admin/coordinator)
 * POST /api/courses/:id/instructors/:instructorId
 */
export async function assignInstructor(req, res, next) {
    try {
        const { id, instructorId } = req.params;

        // Check course exists
        const course = await queryOne(
            'SELECT id FROM courses WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!course) {
            return sendError(res, 404, 'NotFound', 'Course not found');
        }

        // Check instructor exists and has instructor role
        const instructor = await queryOne(
            'SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL',
            [instructorId]
        );

        if (!instructor) {
            return sendError(res, 404, 'NotFound', 'Instructor not found');
        }

        if (instructor.role !== 'instructor') {
            return sendError(res, 400, 'BadRequest', 'User must have instructor role');
        }

        // Assign instructor
        await query(
            'INSERT INTO course_instructors (course_id, instructor_id) VALUES (?, ?)',
            [id, instructorId]
        );

        logger.info(`Instructor ${instructorId} assigned to course ${id} by user ${req.user.id}`);

        return sendSuccess(res, 201, null, 'Instructor assigned successfully');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return sendError(res, 409, 'Conflict', 'Instructor already assigned to this course');
        }
        next(error);
    }
}

/**
 * Unassign instructor from course (admin/coordinator)
 * DELETE /api/courses/:id/instructors/:instructorId
 */
export async function unassignInstructor(req, res, next) {
    try {
        const { id, instructorId } = req.params;

        // Delete assignment
        const result = await query(
            'DELETE FROM course_instructors WHERE course_id = ? AND instructor_id = ?',
            [id, instructorId]
        );

        if (result.affectedRows === 0) {
            return sendError(res, 404, 'NotFound', 'Instructor assignment not found');
        }

        logger.info(`Instructor ${instructorId} unassigned from course ${id} by user ${req.user.id}`);

        return sendSuccess(res, 200, null, 'Instructor unassigned successfully');
    } catch (error) {
        next(error);
    }
}
