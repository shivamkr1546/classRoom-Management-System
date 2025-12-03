import pool from '../config/database.js';
import { query, transaction } from '../utils/db.js';
import { validateSchedule, detectInternalScheduleConflicts, normalizeDateInput } from '../utils/scheduling.js';
import logger from '../utils/logger.js';

/**
 * Schedule Controller
 * Handles all schedule-related operations with conflict detection
 * Phase 3: Scheduling Engine
 */

/**
 * List all schedules with filtering and pagination
 * GET /api/schedules
 */
export async function listSchedules(req, res, next) {
    try {
        const {
            page = 1,
            limit = 10,
            room_id,
            course_id,
            instructor_id,
            status,
            start_date,
            end_date
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit) > 100 ? 100 : parseInt(limit);

        // Build dynamic query
        let sql = `
            SELECT s.*, 
                   r.code as room_code, r.name as room_name, r.capacity as room_capacity,
                   c.code as course_code, c.name as course_name, c.required_capacity,
                   u.name as instructor_name, u.email as instructor_email
            FROM schedules s
            JOIN rooms r ON s.room_id = r.id
            JOIN courses c ON s.course_id = c.id
            JOIN users u ON s.instructor_id = u.id
            WHERE 1=1
        `;
        const params = [];

        // Apply filters
        if (room_id) {
            sql += ' AND s.room_id = ?';
            params.push(parseInt(room_id));
        }

        if (course_id) {
            sql += ' AND s.course_id = ?';
            params.push(parseInt(course_id));
        }

        if (instructor_id) {
            sql += ' AND s.instructor_id = ?';
            params.push(parseInt(instructor_id));
        }

        if (status) {
            sql += ' AND s.status = ?';
            params.push(status);
        }

        if (start_date) {
            sql += ' AND s.date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            sql += ' AND s.date <= ?';
            params.push(end_date);
        }

        // Get total count
        const countSql = sql.replace(
            /SELECT s\.\*.*?FROM/s,
            'SELECT COUNT(*) as total FROM'
        );
        const [{ total }] = await query(countSql, params);

        // Add pagination
        sql += ' ORDER BY s.date ASC, s.start_time ASC LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        const schedules = await query(sql, params);

        res.json({
            success: true,
            data: schedules,
            pagination: {
                page: parseInt(page),
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('List schedules error:', error);
        next(error);
    }
}

/**
 * Get schedule by ID
 * GET /api/schedules/:id
 */
export async function getScheduleById(req, res, next) {
    try {
        const { id } = req.params;

        const sql = `
            SELECT s.*, 
                   r.code as room_code, r.name as room_name, r.type as room_type, 
                   r.capacity as room_capacity, r.location as room_location,
                   c.code as course_code, c.name as course_name, c.required_capacity,
                   u.name as instructor_name, u.email as instructor_email,
                   creator.name as created_by_name
            FROM schedules s
            JOIN rooms r ON s.room_id = r.id
            JOIN courses c ON s.course_id = c.id
            JOIN users u ON s.instructor_id = u.id
            LEFT JOIN users creator ON s.created_by = creator.id
            WHERE s.id = ?
        `;

        const result = await query(sql, [id]);

        if (result.length === 0) {
            return res.status(404).json({
                error: 'NotFoundError',
                message: 'Schedule not found'
            });
        }

        res.json({
            success: true,
            data: result[0]
        });
    } catch (error) {
        logger.error('Get schedule error:', error);
        next(error);
    }
}

/**
 * Create new schedule
 * POST /api/schedules
 * CONCURRENCY CONTROL: Uses row-level locking to prevent race conditions
 */
export async function createSchedule(req, res, next) {
    const { room_id, course_id, instructor_id, date, start_time, end_time } = req.body;
    const created_by = req.user.id;
    const normalizedDate = normalizeDateInput(date);

    // Use transaction with row-level locking
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // CRITICAL: Lock the room and instructor rows to prevent concurrent conflicting schedules
        // Lock room row
        await connection.query(
            'SELECT id FROM rooms WHERE id = ? FOR UPDATE',
            [room_id]
        );

        // Lock instructor row
        await connection.query(
            'SELECT id FROM users WHERE id = ? AND role = ? FOR UPDATE',
            [instructor_id, 'instructor']
        );

        // Lock all existing schedules for this room on this date (prevents concurrent inserts)
        await connection.query(
            `SELECT id FROM schedules 
             WHERE room_id = ? AND date = ? AND status = 'confirmed' 
             FOR UPDATE`,
            [room_id, normalizedDate]
        );

        // Lock all existing schedules for this instructor on this date
        await connection.query(
            `SELECT id FROM schedules 
             WHERE instructor_id = ? AND date = ? AND status = 'confirmed' 
             FOR UPDATE`,
            [instructor_id, normalizedDate]
        );

        // NOW run validation with locks held (prevents race conditions)
        const validation = await validateSchedule({
            room_id,
            course_id,
            instructor_id,
            date,
            start_time,
            end_time
        });

        if (!validation.isValid) {
            await connection.rollback();
            return res.status(409).json({
                error: 'ConflictError',
                message: 'Schedule validation failed',
                errors: validation.errors,
                details: validation.details
            });
        }

        // Insert schedule
        const [result] = await connection.query(
            `INSERT INTO schedules (room_id, course_id, instructor_id, date, start_time, end_time, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [room_id, course_id, instructor_id, normalizedDate, start_time, end_time, created_by]
        );

        await connection.commit();

        // Fetch created schedule with full details (outside transaction)
        const [newSchedule] = await query(`
            SELECT s.*, 
                   r.code as room_code, r.name as room_name,
                   c.code as course_code, c.name as course_name,
                   u.name as instructor_name
            FROM schedules s
            JOIN rooms r ON s.room_id = r.id
            JOIN courses c ON s.course_id = c.id
            JOIN users u ON s.instructor_id = u.id
            WHERE s.id = ?
        `, [result.insertId]);

        logger.info(`Schedule created: ID ${result.insertId} by user ${created_by} (with row-level locking)`);

        res.status(201).json({
            success: true,
            message: 'Schedule created successfully',
            data: newSchedule
        });
    } catch (error) {
        await connection.rollback();
        logger.error('Create schedule error:', error);
        next(error);
    } finally {
        connection.release();
    }
}

/**
 * Update existing schedule
 * PUT /api/schedules/:id
 * CONCURRENCY CONTROL: Uses row-level locking to prevent race conditions
 */
export async function updateSchedule(req, res, next) {
    const { id } = req.params;
    const updates = req.body;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Lock the schedule being updated
        const [existing] = await connection.query(
            'SELECT * FROM schedules WHERE id = ? FOR UPDATE',
            [id]
        );

        if (!existing || existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'NotFoundError',
                message: 'Schedule not found'
            });
        }

        const currentSchedule = existing[0];

        // Merge current data with updates
        const updatedData = {
            room_id: updates.room_id || currentSchedule.room_id,
            course_id: updates.course_id || currentSchedule.course_id,
            instructor_id: updates.instructor_id || currentSchedule.instructor_id,
            date: updates.date || currentSchedule.date,
            start_time: updates.start_time || currentSchedule.start_time,
            end_time: updates.end_time || currentSchedule.end_time
        };

        const normalizedDate = normalizeDateInput(updatedData.date);

        // Lock the updated room and instructor rows
        await connection.query(
            'SELECT id FROM rooms WHERE id = ? FOR UPDATE',
            [updatedData.room_id]
        );

        await connection.query(
            'SELECT id FROM users WHERE id = ? AND role = ? FOR UPDATE',
            [updatedData.instructor_id, 'instructor']
        );

        // Lock all other schedules for this room on this date
        await connection.query(
            `SELECT id FROM schedules 
             WHERE room_id = ? AND date = ? AND status = 'confirmed' AND id != ?
             FOR UPDATE`,
            [updatedData.room_id, normalizedDate, id]
        );

        // Lock all other schedules for this instructor on this date
        await connection.query(
            `SELECT id FROM schedules 
             WHERE instructor_id = ? AND date = ? AND status = 'confirmed' AND id != ?
             FOR UPDATE`,
            [updatedData.instructor_id, normalizedDate, id]
        );

        // Validate updated schedule (exclude current schedule from conflict check)
        const validation = await validateSchedule(updatedData, parseInt(id));

        if (!validation.isValid) {
            await connection.rollback();
            return res.status(409).json({
                error: 'ConflictError',
                message: 'Schedule update validation failed',
                errors: validation.errors,
                details: validation.details
            });
        }

        // Build update query
        const fields = [];
        const values = [];

        if (updates.room_id) {
            fields.push('room_id = ?');
            values.push(updates.room_id);
        }
        if (updates.course_id) {
            fields.push('course_id = ?');
            values.push(updates.course_id);
        }
        if (updates.instructor_id) {
            fields.push('instructor_id = ?');
            values.push(updates.instructor_id);
        }
        if (updates.date) {
            fields.push('date = ?');
            values.push(normalizedDate);
        }
        if (updates.start_time) {
            fields.push('start_time = ?');
            values.push(updates.start_time);
        }
        if (updates.end_time) {
            fields.push('end_time = ?');
            values.push(updates.end_time);
        }

        values.push(id);

        await connection.query(
            `UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        await connection.commit();

        // Fetch updated schedule (outside transaction)
        const [updatedSchedule] = await query(`
            SELECT s.*, 
                   r.code as room_code, r.name as room_name,
                   c.code as course_code, c.name as course_name,
                   u.name as instructor_name
            FROM schedules s
            JOIN rooms r ON s.room_id = r.id
            JOIN courses c ON s.course_id = c.id
            JOIN users u ON s.instructor_id = u.id
            WHERE s.id = ?
        `, [id]);

        logger.info(`Schedule updated: ID ${id} by user ${req.user.id} (with row-level locking)`);

        res.json({
            success: true,
            message: 'Schedule updated successfully',
            data: updatedSchedule
        });
    } catch (error) {
        await connection.rollback();
        logger.error('Update schedule error:', error);
        next(error);
    } finally {
        connection.release();
    }
}

/**
 * Cancel schedule (soft delete via status)
 * DELETE /api/schedules/:id
 */
export async function cancelSchedule(req, res, next) {
    try {
        const { id } = req.params;

        // Check if schedule exists
        const existing = await query('SELECT * FROM schedules WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                error: 'NotFoundError',
                message: 'Schedule not found'
            });
        }

        // Update status to cancelled (soft delete)
        await query('UPDATE schedules SET status = ? WHERE id = ?', ['cancelled', id]);

        logger.info(`Schedule cancelled: ID ${id} by user ${req.user.id}`);

        res.json({
            success: true,
            message: 'Schedule cancelled successfully'
        });
    } catch (error) {
        logger.error('Cancel schedule error:', error);
        next(error);
    }
}

/**
 * Bulk create schedules
 * POST /api/schedules/bulk
 */
export async function bulkCreateSchedules(req, res, next) {
    try {
        const schedules = req.body; // Array of schedule objects
        const created_by = req.user.id;
        const validSchedules = [];
        const errorMap = new Map();

        const addError = (index, messages) => {
            if (!messages || messages.length === 0) {
                return;
            }

            const existing = errorMap.get(index) || {
                line: index + 1,
                schedule: schedules[index],
                errors: []
            };

            existing.errors.push(...messages);
            errorMap.set(index, existing);
        };

        const schedulesWithMeta = schedules.map((schedule, idx) => ({
            ...schedule,
            __index: idx
        }));

        // Validate all schedules against current database state
        for (const schedule of schedulesWithMeta) {
            const validation = await validateSchedule(schedule);

            if (!validation.isValid) {
                addError(schedule.__index, validation.errors);
            } else {
                validSchedules.push(schedule);
            }
        }

        // Detect conflicts inside the payload itself
        const internalConflicts = detectInternalScheduleConflicts(validSchedules);
        for (const conflict of internalConflicts) {
            const {
                aIndex,
                bIndex,
                type,
                date,
                room_id,
                instructor_id,
                timeRangeA,
                timeRangeB
            } = conflict;

            const messageForA = type === 'room'
                ? `Room conflict with entry ${bIndex + 1} on ${date} (${timeRangeB}) for room ${room_id}`
                : `Instructor conflict with entry ${bIndex + 1} on ${date} (${timeRangeB}) for instructor ${instructor_id}`;

            const messageForB = type === 'room'
                ? `Room conflict with entry ${aIndex + 1} on ${date} (${timeRangeA}) for room ${room_id}`
                : `Instructor conflict with entry ${aIndex + 1} on ${date} (${timeRangeA}) for instructor ${instructor_id}`;

            addError(aIndex, [messageForA]);
            addError(bIndex, [messageForB]);
        }

        const errors = Array.from(errorMap.values());

        if (errors.length > 0) {
            return res.status(409).json({
                error: 'BulkValidationError',
                message: `${errors.length} schedule(s) failed validation. Transaction not executed.`,
                errors
            });
        }

        // All validations passed - execute transaction
        const insertedIds = await transaction(async (conn) => {
            const ids = [];

            for (const schedule of validSchedules) {
                const { __index, ...payload } = schedule;
                const normalizedDate = normalizeDateInput(payload.date);
                const sql = `
                    INSERT INTO schedules (room_id, course_id, instructor_id, date, start_time, end_time, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                const [result] = await conn.query(sql, [
                    payload.room_id,
                    payload.course_id,
                    payload.instructor_id,
                    normalizedDate,
                    payload.start_time,
                    payload.end_time,
                    created_by
                ]);

                ids.push(result.insertId);
            }

            return ids;
        });

        logger.info(`Bulk schedules created: ${insertedIds.length} schedules by user ${created_by}`);

        res.status(201).json({
            success: true,
            message: `Successfully created ${insertedIds.length} schedules`,
            data: {
                created: insertedIds.length,
                ids: insertedIds
            }
        });
    } catch (error) {
        logger.error('Bulk create schedules error:', error);
        next(error);
    }
}
