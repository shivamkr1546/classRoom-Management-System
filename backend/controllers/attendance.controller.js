import { query, transaction } from '../utils/db.js';
import logger from '../utils/logger.js';

const normalizeDate = (value) => value instanceof Date
    ? value.toISOString().split('T')[0]
    : value;

/**
 * Attendance Controller
 * Handles attendance marking with enrollment validation and audit trail
 * Phase 4: Attendance & Analytics
 */

// Mark attendance for a single student
// POST /api/attendance
export async function markAttendance(req, res, next) {
    try {
        const { schedule_id, student_id, status } = req.body;
        const marked_by = req.user.id;

        // Verify schedule exists and is not cancelled
        const [schedule] = await query(
            `SELECT s.id, s.date, s.start_time, s.course_id, s.status 
             FROM schedules s 
             WHERE s.id = ?`,
            [schedule_id]
        );

        if (!schedule) {
            return res.status(404).json({
                error: 'NotFound',
                message: 'Schedule not found'
            });
        }

        if (schedule.status === 'cancelled') {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Cannot mark attendance for cancelled schedule'
            });
        }

        // Check if schedule is in the future (timezone-aware)
        const scheduleDateTime = new Date(`${normalizeDate(schedule.date)}T${schedule.start_time}Z`);
        const now = new Date();

        if (scheduleDateTime > now) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Cannot mark attendance for future schedules'
            });
        }

        // Verify student is enrolled in the course
        const [enrollment] = await query(
            `SELECT id FROM course_enrollments 
             WHERE course_id = ? AND student_id = ? AND status = 'active'`,
            [schedule.course_id, student_id]
        );

        if (!enrollment) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Student not enrolled in this course'
            });
        }

        // Insert with upsert pattern (allows updating if already marked)
        await query(`
            INSERT INTO attendance (schedule_id, student_id, status, marked_by, marked_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                updated_by = VALUES(marked_by),
                updated_at = CURRENT_TIMESTAMP
        `, [schedule_id, student_id, status, marked_by]);

        // Fetch the created/updated attendance record
        const [attendance] = await query(
            'SELECT * FROM attendance WHERE schedule_id = ? AND student_id = ?',
            [schedule_id, student_id]
        );

        logger.info(`Attendance marked for student ${student_id}, schedule ${schedule_id}, status: ${status}`);

        res.status(201).json({
            success: true,
            message: 'Attendance marked successfully',
            data: attendance
        });
    } catch (err) {
        next(err);
    }
}

// Bulk mark attendance for a schedule
// POST /api/attendance/bulk
export async function bulkMarkAttendance(req, res, next) {
    try {
        const { schedule_id, attendance, reason = '' } = req.body;
        const marked_by = req.user.id;

        if (!Array.isArray(attendance) || attendance.length === 0) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Attendance array is required'
            });
        }

        // Verify schedule exists
        const [schedule] = await query(
            'SELECT id, date, start_time, course_id, status FROM schedules WHERE id = ?',
            [schedule_id]
        );

        if (!schedule) {
            return res.status(404).json({
                error: 'NotFound',
                message: 'Schedule not found'
            });
        }

        if (schedule.status === 'cancelled') {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Cannot mark attendance for cancelled schedule'
            });
        }

        // Check future schedule
        const scheduleDateTime = new Date(`${normalizeDate(schedule.date)}T${schedule.start_time}Z`);
        if (scheduleDateTime > new Date()) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Cannot mark attendance for future schedules'
            });
        }

        // Get all enrolled students for this course
        const enrolledStudents = await query(
            `SELECT student_id FROM course_enrollments 
             WHERE course_id = ? AND status = 'active'`,
            [schedule.course_id]
        );
        const enrolledIds = new Set(enrolledStudents.map(e => e.student_id));

        // Validate all students are enrolled
        const errors = [];
        for (let i = 0; i < attendance.length; i++) {
            if (!enrolledIds.has(attendance[i].student_id)) {
                errors.push(`Student ${attendance[i].student_id} is not enrolled in this course`);
            }
        }

        if (errors.length > 0) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Some students are not enrolled',
                errors
            });
        }

        // Fetch existing attendance records before update (for audit logging)
        const existingAttendance = await query(`
            SELECT student_id, status FROM attendance 
            WHERE schedule_id = ? AND student_id IN (${attendance.map(() => '?').join(',')})
        `, [schedule_id, ...attendance.map(a => a.student_id)]);

        const existingMap = new Map(existingAttendance.map(a => [a.student_id, a.status]));

        // Bulk insert with transaction + audit logging
        const result = await transaction(async (conn) => {
            const values = attendance.map(a => [
                schedule_id,
                a.student_id,
                a.status,
                marked_by,
                new Date()
            ]);

            const [insertResult] = await conn.query(`
                INSERT INTO attendance (schedule_id, student_id, status, marked_by, marked_at)
                VALUES ?
                ON DUPLICATE KEY UPDATE
                    status = VALUES(status),
                    updated_by = VALUES(marked_by),
                    updated_at = CURRENT_TIMESTAMP
            `, [values]);

            // Log all changes to audit table
            const auditValues = attendance.map(a => {
                const oldStatus = existingMap.get(a.student_id) || null;
                return [
                    null, // attendance_id will be filled after we fetch
                    oldStatus, // NULL for new records
                    a.status, // new status
                    marked_by, // changed_by
                    new Date() // changed_at
                ];
            });

            // Fetch attendance IDs after insert/update
            const [attendanceRecords] = await conn.query(`
                SELECT id, student_id FROM attendance 
                WHERE schedule_id = ? AND student_id IN (${attendance.map(() => '?').join(',')})
            `, [schedule_id, ...attendance.map(a => a.student_id)]);

            const idMap = new Map(attendanceRecords.map(a => [a.student_id, a.id]));

            // Update audit values with attendance IDs and schedule_id
            const finalAuditValues = attendance.map(a => {
                const oldStatus = existingMap.get(a.student_id) || null;
                const attendanceId = idMap.get(a.student_id);
                return [
                    attendanceId,
                    schedule_id, // Denormalized for efficient querying
                    oldStatus,
                    a.status,
                    marked_by,
                    reason || null // NULL if empty string
                ];
            });

            // Insert audit records
            await conn.query(`
                INSERT INTO attendance_audit 
                (attendance_id, schedule_id, old_status, new_status, changed_by, reason)
                VALUES ?
            `, [finalAuditValues]);

            return { affectedRows: insertResult.affectedRows };
        });

        logger.info(`Bulk attendance marked for schedule ${schedule_id}, ${attendance.length} students`);

        res.status(201).json({
            success: true,
            message: 'Attendance marked for all students',
            data: {
                scheduleId: schedule_id,
                totalStudents: attendance.length,
                processed: result.affectedRows
            }
        });
    } catch (err) {
        next(err);
    }
}

// Get attendance by schedule
// GET /api/attendance/schedule/:scheduleId
export async function getAttendanceBySchedule(req, res, next) {
    try {
        const { scheduleId } = req.params;

        const attendanceRecords = await query(`
            SELECT 
                a.*,
                s.roll_no,
                s.name as student_name,
                s.email as student_email,
                u1.name as marked_by_name,
                u2.name as updated_by_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            LEFT JOIN users u1 ON a.marked_by = u1.id
            LEFT JOIN users u2 ON a.updated_by = u2.id
            WHERE a.schedule_id = ?
            ORDER BY s.roll_no
        `, [scheduleId]);

        res.status(200).json({
            success: true,
            data: attendanceRecords
        });
    } catch (err) {
        next(err);
    }
}

// Get student attendance history
// GET /api/attendance/student/:studentId
export async function getStudentAttendance(req, res, next) {
    try {
        const { studentId } = req.params;
        const { start_date, end_date, course_id } = req.query;

        let sql = `
            SELECT 
                a.*,
                sch.date,
                sch.start_time,
                sch.end_time,
                c.code as course_code,
                c.name as course_name,
                r.code as room_code,
                r.name as room_name
            FROM attendance a
            JOIN schedules sch ON a.schedule_id = sch.id
            JOIN courses c ON sch.course_id = c.id
            JOIN rooms r ON sch.room_id = r.id
            WHERE a.student_id = ?
        `;
        const params = [studentId];

        if (start_date) {
            sql += ' AND sch.date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            sql += ' AND sch.date <= ?';
            params.push(end_date);
        }

        if (course_id) {
            sql += ' AND sch.course_id = ?';
            params.push(course_id);
        }

        sql += ' ORDER BY sch.date DESC, sch.start_time DESC';

        const attendanceRecords = await query(sql, params);

        res.status(200).json({
            success: true,
            data: attendanceRecords
        });
    } catch (err) {
        next(err);
    }
}

// Update attendance status
// PUT /api/attendance/:id
export async function updateAttendance(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updated_by = req.user.id;

        // Check if attendance record exists
        const [attendance] = await query(
            'SELECT * FROM attendance WHERE id = ?',
            [id]
        );

        if (!attendance) {
            return res.status(404).json({
                error: 'NotFound',
                message: 'Attendance record not found'
            });
        }

        // Update the status
        await query(
            'UPDATE attendance SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, updated_by, id]
        );

        // Fetch updated record
        const [updated] = await query(
            'SELECT * FROM attendance WHERE id = ?',
            [id]
        );

        logger.info(`Attendance ${id} updated to status: ${status} by user ${updated_by}`);

        res.status(200).json({
            success: true,
            message: 'Attendance updated successfully',
            data: updated
        });
    } catch (err) {
        next(err);
    }
}
