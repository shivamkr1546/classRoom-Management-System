import pool from '../config/database.js';
import { query, queryOne, paginate, buildPaginationMeta } from '../utils/db.js';
import { sendSuccess, sendPaginatedResponse, sendError } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Get all students with pagination and filtering
 * GET /api/students?page=1&limit=10&class_label=CS101&search=john
 */
export async function getStudents(req, res, next) {
    try {
        const { page, limit, offset } = paginate(req.query.page, req.query.limit);
        const { class_label, search } = req.query;

        // Build WHERE clause
        const conditions = ['deleted_at IS NULL'];
        const params = [];

        if (class_label) {
            conditions.push('class_label = ?');
            params.push(class_label);
        }

        if (search) {
            conditions.push('(name LIKE ? OR roll_no LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM students ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get paginated students
        const students = await query(
            `SELECT id, roll_no, name, email, class_label, created_at, updated_at 
             FROM students 
             ${whereClause}
             ORDER BY roll_no ASC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const pagination = buildPaginationMeta(total, page, limit);

        return sendPaginatedResponse(res, students, pagination);
    } catch (error) {
        next(error);
    }
}

/**
 * Get single student by ID
 * GET /api/students/:id
 */
export async function getStudentById(req, res, next) {
    try {
        const { id } = req.params;

        const student = await queryOne(
            'SELECT id, roll_no, name, email, class_label, created_at, updated_at FROM students WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!student) {
            return sendError(res, 404, 'NotFound', 'Student not found');
        }

        return sendSuccess(res, 200, student);
    } catch (error) {
        next(error);
    }
}

/**
 * Create new student (admin/coordinator)
 * POST /api/students
 */
export async function createStudent(req, res, next) {
    try {
        const { roll_no, name, email, class_label } = req.body;

        // Insert student
        const result = await query(
            'INSERT INTO students (roll_no, name, email, class_label, created_by) VALUES (?, ?, ?, ?, ?)',
            [roll_no, name, email || null, class_label || null, req.user.id]
        );

        // Get created student
        const student = await queryOne(
            'SELECT id, roll_no, name, email, class_label, created_at FROM students WHERE id = ?',
            [result.insertId]
        );

        logger.info(`Student created: ${roll_no} by user ${req.user.id}`);

        return sendSuccess(res, 201, student, 'Student created successfully');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return sendError(res, 409, 'Conflict', 'Roll number already exists');
        }
        next(error);
    }
}

/**
 * Update student (admin/coordinator)
 * PUT /api/students/:id
 */
export async function updateStudent(req, res, next) {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Check if student exists
        const existingStudent = await queryOne(
            'SELECT id FROM students WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!existingStudent) {
            return sendError(res, 404, 'NotFound', 'Student not found');
        }

        // Build update query
        const fields = [];
        const values = [];

        if (updates.roll_no) {
            fields.push('roll_no = ?');
            values.push(updates.roll_no);
        }
        if (updates.name) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.email !== undefined) {
            fields.push('email = ?');
            values.push(updates.email);
        }
        if (updates.class_label !== undefined) {
            fields.push('class_label = ?');
            values.push(updates.class_label);
        }

        // Add audit fields
        fields.push('updated_by = ?');
        values.push(req.user.id);

        // Execute update
        await query(
            `UPDATE students SET ${fields.join(', ')} WHERE id = ?`,
            [...values, id]
        );

        // Get updated student
        const student = await queryOne(
            'SELECT id, roll_no, name, email, class_label, created_at, updated_at FROM students WHERE id = ?',
            [id]
        );

        logger.info(`Student updated: ${id} by user ${req.user.id}`);

        return sendSuccess(res, 200, student, 'Student updated successfully');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return sendError(res, 409, 'Conflict', 'Roll number already exists');
        }
        next(error);
    }
}

/**
 * Delete student (soft delete, admin only)
 * DELETE /api/students/:id
 */
export async function deleteStudent(req, res, next) {
    try {
        const { id } = req.params;

        // Check if student exists
        const student = await queryOne(
            'SELECT id, roll_no FROM students WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!student) {
            return sendError(res, 404, 'NotFound', 'Student not found');
        }

        // Soft delete
        await query(
            'UPDATE students SET deleted_at = NOW(), deleted_by = ? WHERE id = ?',
            [req.user.id, id]
        );

        logger.info(`Student soft-deleted: ${student.roll_no} (${id}) by user ${req.user.id}`);

        return sendSuccess(res, 200, null, 'Student deleted successfully');
    } catch (error) {
        next(error);
    }
}

/**
 * Bulk import students (admin/coordinator)
 * POST /api/students/bulk
 * Transactional - all or nothing
 */
export async function bulkImportStudents(req, res, next) {
    const students = req.body;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const errors = [];
        const imported = [];

        for (let i = 0; i < students.length; i++) {
            const s = students[i];

            // Check for duplicate roll_no in database
            const [exists] = await conn.query(
                'SELECT 1 FROM students WHERE roll_no = ? LIMIT 1',
                [s.roll_no]
            );

            if (exists.length > 0) {
                errors.push({
                    index: i,
                    roll_no: s.roll_no,
                    reason: 'Roll number already exists'
                });
                continue;
            }

            // Check for duplicate roll_no within the import batch
            const duplicateInBatch = imported.find(imp => imp.roll_no === s.roll_no);
            if (duplicateInBatch) {
                errors.push({
                    index: i,
                    roll_no: s.roll_no,
                    reason: 'Duplicate roll number in import batch'
                });
                continue;
            }

            // Insert student
            try {
                await conn.query(
                    'INSERT INTO students (roll_no, name, email, class_label, created_by) VALUES (?, ?, ?, ?, ?)',
                    [s.roll_no, s.name, s.email || null, s.class_label || null, req.user.id]
                );
                imported.push(s);
            } catch (insertError) {
                errors.push({
                    index: i,
                    roll_no: s.roll_no,
                    reason: insertError.message
                });
            }
        }

        // If any errors, rollback entire transaction
        if (errors.length > 0) {
            await conn.rollback();
            logger.warn(`Bulk import failed: ${errors.length} errors by user ${req.user.id}`);
            return sendError(
                res,
                409,
                'BulkImportFailed',
                `Bulk import failed with ${errors.length} error(s). Transaction rolled back.`,
                { errors, attempted: students.length, failed: errors.length }
            );
        }

        // All successful, commit transaction
        await conn.commit();

        logger.info(`Bulk import successful: ${imported.length} students by user ${req.user.id}`);

        return sendSuccess(
            res,
            201,
            { imported: imported.length, students: imported },
            'Students imported successfully'
        );
    } catch (error) {
        await conn.rollback();
        logger.error(`Bulk import error: ${error.message}`);
        next(error);
    } finally {
        conn.release();
    }
}
