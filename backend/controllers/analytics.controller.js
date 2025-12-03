import { query } from '../utils/db.js';
import { sendSuccess } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Analytics Controller
 * Provides attendance and utilization analytics
 * Phase 4: Attendance & Analytics
 */

// Get summary statistics for dashboard
// GET /api/analytics/summary
export async function getSummary(req, res, next) {
    try {
        // Get total counts for dashboard
        const [userCount] = await query('SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL');
        const [roomCount] = await query('SELECT COUNT(*) as total FROM rooms WHERE deleted_at IS NULL');
        const [courseCount] = await query('SELECT COUNT(*) as total FROM courses WHERE deleted_at IS NULL');
        const [studentCount] = await query('SELECT COUNT(*) as total FROM students WHERE deleted_at IS NULL');

        const summary = {
            totalUsers: userCount.total,
            totalRooms: roomCount.total,
            totalCourses: courseCount.total,
            totalStudents: studentCount.total
        };

        return sendSuccess(res, 200, summary, 'Summary retrieved successfully');
    } catch (error) {
        next(error);
    }
}


// Get room utilization statistics
// GET /api/analytics/rooms?start_date=2024-01-01&end_date=2024-12-31
export async function getRoomUtilization(req, res, next) {
    try {
        const { start_date, end_date, room_id } = req.query;

        let sql = `
            SELECT 
                r.id,
                r.code,
                r.name,
                r.type,
                r.capacity,
                COUNT(s.id) as total_schedules,
                SUM(TIME_TO_SEC(TIMEDIFF(s.end_time, s.start_time))) / 3600 as total_hours,
                ROUND(SUM(TIME_TO_SEC(TIMEDIFF(s.end_time, s.start_time))) / 3600 / 
                      NULLIF(DATEDIFF(?, ?) + 1, 0) / 24 * 100, 2) as utilization_rate
            FROM rooms r
            LEFT JOIN schedules s ON r.id = s.room_id AND s.status = 'confirmed'
        `;
        const params = [];

        if (start_date && end_date) {
            sql += ' AND s.date BETWEEN ? AND ?';
            params.push(start_date, end_date, start_date, end_date);
        } else {
            params.push('2024-01-01', '2024-12-31');
        }

        if (room_id) {
            sql += ' AND r.id = ?';
            params.push(room_id);
        }

        sql += ' GROUP BY r.id ORDER BY utilization_rate DESC';

        const utilization = await query(sql, params);

        res.status(200).json({
            success: true,
            data: utilization
        });
    } catch (err) {
        next(err);
    }
}

// Get instructor workload statistics
// GET /api/analytics/instructors?start_date=2024-01-01&end_date=2024-12-31
export async function getInstructorWorkload(req, res, next) {
    try {
        const { start_date, end_date, instructor_id } = req.query;

        let sql = `
            SELECT 
                u.id,
                u.name,
                u.email,
                COUNT(DISTINCT s.course_id) as course_count,
                COUNT(s.id) as total_schedules,
                SUM(TIME_TO_SEC(TIMEDIFF(s.end_time, s.start_time))) / 3600 as total_hours
            FROM users u
            LEFT JOIN schedules s ON u.id = s.instructor_id AND s.status = 'confirmed'
            WHERE u.role = 'instructor'
        `;
        const params = [];

        if (start_date) {
            sql += ' AND s.date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            sql += ' AND s.date <= ?';
            params.push(end_date);
        }

        if (instructor_id) {
            sql += ' AND u.id = ?';
            params.push(instructor_id);
        }

        sql += ' GROUP BY u.id ORDER BY total_hours DESC';

        const workload = await query(sql, params);

        res.status(200).json({
            success: true,
            data: workload
        });
    } catch (err) {
        next(err);
    }
}

// Get course attendance statistics
// GET /api/analytics/courses/:courseId/attendance?start_date=2024-01-01&end_date=2024-12-31
export async function getCourseAttendance(req, res, next) {
    try {
        const { courseId } = req.params;
        const { start_date, end_date } = req.query;

        // Get enrolled student count
        const [enrollmentData] = await query(
            'SELECT COUNT(*) as enrolled_count FROM course_enrollments WHERE course_id = ? AND status = "active"',
            [courseId]
        );
        const enrolledCount = enrollmentData.enrolled_count;

        // Get schedule-wise attendance
        let sql = `
            SELECT 
                s.id as schedule_id,
                s.date,
                s.start_time,
                s.end_time,
                ? as enrolled_count,
                COUNT(DISTINCT a.student_id) as total_attendance,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
                ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / NULLIF(?, 0), 2) as attendance_rate
            FROM schedules s
            LEFT JOIN attendance a ON s.id = a.schedule_id
            WHERE s.course_id = ? AND s.status = 'confirmed'
        `;
        const params = [enrolledCount, enrolledCount, courseId];

        if (start_date) {
            sql += ' AND s.date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            sql += ' AND s.date <= ?';
            params.push(end_date);
        }

        sql += ' GROUP BY s.id ORDER BY s.date DESC, s.start_time DESC';

        const scheduleAttendance = await query(sql, params);

        // Calculate overall statistics
        const totalSchedules = scheduleAttendance.length;
        const avgAttendanceRate = totalSchedules > 0
            ? scheduleAttendance.reduce((sum, s) => sum + (parseFloat(s.attendance_rate) || 0), 0) / totalSchedules
            : 0;

        res.status(200).json({
            success: true,
            data: {
                courseId: parseInt(courseId),
                enrolledCount,
                totalSchedules,
                averageAttendanceRate: Math.round(avgAttendanceRate * 100) / 100,
                schedules: scheduleAttendance
            }
        });
    } catch (err) {
        next(err);
    }
}

// Get student attendance summary
// GET /api/analytics/students/:studentId/attendance?start_date=2024-01-01&end_date=2024-12-31
export async function getStudentAttendanceSummary(req, res, next) {
    try {
        const { studentId } = req.params;
        const { start_date, end_date } = req.query;

        // Get overall attendance summary
        let sql = `
            SELECT 
                COUNT(a.id) as total_records,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
                ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / 
                      NULLIF(COUNT(a.id), 0), 2) as attendance_percentage
            FROM attendance a
            JOIN schedules s ON a.schedule_id = s.id
            WHERE a.student_id = ?
        `;
        const params = [studentId];

        if (start_date) {
            sql += ' AND s.date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            sql += ' AND s.date <= ?';
            params.push(end_date);
        }

        const [overallSummary] = await query(sql, params);

        // Get per-course breakdown
        let courseSql = `
            SELECT 
                c.id as course_id,
                c.code as course_code,
                c.name as course_name,
                COUNT(a.id) as total_classes,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / 
                      NULLIF(COUNT(a.id), 0), 2) as attendance_percentage
            FROM attendance a
            JOIN schedules s ON a.schedule_id = s.id
            JOIN courses c ON s.course_id = c.id
            WHERE a.student_id = ?
        `;
        const courseParams = [studentId];

        if (start_date) {
            courseSql += ' AND s.date >= ?';
            courseParams.push(start_date);
        }

        if (end_date) {
            courseSql += ' AND s.date <= ?';
            courseParams.push(end_date);
        }

        courseSql += ' GROUP BY c.id ORDER BY c.code';

        const perCourseBreakdown = await query(courseSql, courseParams);

        res.status(200).json({
            success: true,
            data: {
                studentId: parseInt(studentId),
                overall: overallSummary,
                perCourse: perCourseBreakdown
            }
        });
    } catch (err) {
        next(err);
    }
}
