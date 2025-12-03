import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import { format } from 'date-fns';

/**
 * MarkAttendance Component
 * Interactive attendance marking page with student checklist and bulk actions
 * Restricted to Admin/Coordinator roles
 */
export default function MarkAttendance() {
    const [courses, setCourses] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [attendance, setAttendance] = useState({});
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Fetch courses on mount
    useEffect(() => {
        fetchCourses();
    }, []);

    // Fetch schedules when course or date changes
    useEffect(() => {
        if (selectedCourse && selectedDate) {
            fetchSchedules();
        }
    }, [selectedCourse, selectedDate]);

    const fetchCourses = async () => {
        try {
            const response = await axios.get('/courses', {
                params: { limit: 1000 }
            });
            setCourses(response.data.data.courses || []);
        } catch (error) {
            console.error('Failed to fetch courses:', error);
            if (window.showToast) {
                window.showToast('Failed to load courses', 'error');
            }
        }
    };

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/schedules', {
                params: {
                    course_id: selectedCourse,
                    start_date: selectedDate,
                    end_date: selectedDate,
                    limit: 50
                }
            });
            const scheduleList = response.data.data.schedules || [];
            setSchedules(scheduleList);

            // Auto-select first schedule if only one exists
            if (scheduleList.length === 1) {
                handleScheduleSelect(scheduleList[0]);
            } else {
                setSelectedSchedule(null);
                setStudents([]);
                setAttendance({});
            }
        } catch (error) {
            console.error('Failed to fetch schedules:', error);
            if (window.showToast) {
                window.showToast('Failed to load schedules', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleSelect = async (schedule) => {
        setSelectedSchedule(schedule);
        setLoading(true);

        try {
            // Fetch enrolled students
            const enrollResponse = await axios.get(`/enrollments/courses/${schedule.course_id}`);
            const enrolledStudents = enrollResponse.data.data || [];

            // Fetch existing attendance records
            const attResponse = await axios.get(`/attendance/schedule/${schedule.id}`);
            const attRecords = attResponse.data.data || [];

            setStudents(enrolledStudents);

            // Build attendance map
            const attMap = {};
            attRecords.forEach(record => {
                attMap[record.student_id] = record.status;
            });

            // Initialize with existing attendance or default to 'present'
            const initialAtt = {};
            enrolledStudents.forEach(enrollment => {
                initialAtt[enrollment.student_id] = attMap[enrollment.student_id] || 'absent';
            });
            setAttendance(initialAtt);
        } catch (error) {
            console.error('Failed to load attendance data:', error);
            if (window.showToast) {
                window.showToast('Failed to load student attendance', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleBulkMark = (status) => {
        const bulkAtt = {};
        students.forEach(enrollment => {
            bulkAtt[enrollment.student_id] = status;
        });
        setAttendance(bulkAtt);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedSchedule) {
            if (window.showToast) {
                window.showToast('Please select a schedule', 'warning');
            }
            return;
        }

        // Check if schedule is in the future
        const scheduleDateTime = new Date(`${selectedSchedule.date}T${selectedSchedule.start_time}`);
        if (scheduleDateTime > new Date()) {
            if (window.showToast) {
                window.showToast('Cannot mark attendance for future schedules', 'error');
            }
            return;
        }

        setSubmitting(true);

        try {
            const attendanceArray = Object.entries(attendance).map(([studentId, status]) => ({
                student_id: parseInt(studentId),
                status
            }));

            await axios.post('/attendance/bulk', {
                schedule_id: selectedSchedule.id,
                attendance: attendanceArray,
                reason: reason.trim() || '' // Include reason for audit trail
            });

            if (window.showToast) {
                window.showToast('Attendance marked successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to mark attendance:', error);
            const errorMsg = error.response?.data?.message || 'Failed to mark attendance';
            if (window.showToast) {
                window.showToast(errorMsg, 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const calculatePercentage = () => {
        const total = students.length;
        if (total === 0) return 0;
        const present = Object.values(attendance).filter(status => status === 'present').length;
        return Math.round((present / total) * 100);
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'present': return 'badge-success';
            case 'absent': return 'badge-danger';
            case 'late': return 'badge-warning';
            case 'excused': return 'badge-info';
            default: return 'badge-secondary';
        }
    };

    return (
        <div className="mark-attendance-page">
            <div className="page-header">
                <h1>Mark Attendance</h1>
                <p>Mark student attendance for scheduled classes</p>
            </div>

            <div className="filters-section">
                <div className="form-group">
                    <label htmlFor="course-select">Select Course</label>
                    <select
                        id="course-select"
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="form-control"
                    >
                        <option value="">-- Select Course --</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>
                                {course.code} - {course.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="date-select">Select Date</label>
                    <input
                        type="date"
                        id="date-select"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        className="form-control"
                    />
                </div>
            </div>

            {schedules.length > 1 && (
                <div className="schedules-list">
                    <h3>Select Schedule</h3>
                    <div className="schedule-cards">
                        {schedules.map(schedule => (
                            <button
                                key={schedule.id}
                                className={`schedule-card ${selectedSchedule?.id === schedule.id ? 'selected' : ''}`}
                                onClick={() => handleScheduleSelect(schedule)}
                            >
                                <div className="schedule-time">
                                    {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                                </div>
                                <div className="schedule-room">{schedule.room_name}</div>
                                <div className="schedule-instructor">{schedule.instructor_name}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {loading && <div className="loading-spinner">Loading...</div>}

            {selectedSchedule && students.length > 0 && (
                <form onSubmit={handleSubmit} className="attendance-form">
                    <div className="attendance-header">
                        <div className="attendance-stats">
                            <h3>Attendance: {calculatePercentage()}%</h3>
                            <p>
                                {Object.values(attendance).filter(s => s === 'present').length} / {students.length} Present
                            </p>
                        </div>
                        <div className="bulk-actions">
                            <button
                                type="button"
                                className="btn btn-success"
                                onClick={() => handleBulkMark('present')}
                            >
                                Mark All Present
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleBulkMark('absent')}
                            >
                                Mark All Absent
                            </button>
                        </div>
                    </div>

                    <div className="students-list">
                        {students.map((enrollment) => (
                            <div key={enrollment.student_id} className="student-row">
                                <div className="student-info">
                                    <div className="student-name">{enrollment.student_name}</div>
                                    <div className="student-roll">{enrollment.student_roll_no}</div>
                                </div>
                                <div className="status-buttons">
                                    {['present', 'absent', 'late', 'excused'].map(status => (
                                        <button
                                            key={status}
                                            type="button"
                                            className={`status-btn ${getStatusBadgeClass(status)} ${attendance[enrollment.student_id] === status ? 'active' : ''}`}
                                            onClick={() => handleStatusChange(enrollment.student_id, status)}
                                        >
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="reason-section">
                        <label htmlFor="reason-textarea">Reason for Changes (Optional, for audit trail)</label>
                        <textarea
                            id="reason-textarea"
                            className="reason-textarea"
                            placeholder="E.g., Student arrived late due to medical emergency..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={2}
                            maxLength={500}
                        />
                        {reason.length > 0 && reason.length < 5 && (
                            <span className="validation-hint">Reason must be at least 5 characters if provided</span>
                        )}
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : 'Save Attendance'}
                        </button>
                    </div>
                </form>
            )}

            {selectedSchedule && students.length === 0 && !loading && (
                <div className="empty-state">
                    <p>No students enrolled in this course</p>
                </div>
            )}

            <style jsx>{`
                .mark-attendance-page {
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .page-header {
                    margin-bottom: 2rem;
                }

                .page-header h1 {
                    font-size: 2rem;
                    margin-bottom: 0.5rem;
                }

                .page-header p {
                    color: var(--text-secondary);
                }

                .filters-section {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                    padding: 1.5rem;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group label {
                    font-weight: 500;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .form-control {
                    padding: 0.625rem;
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    font-size: 0.875rem;
                }

                .schedules-list {
                    margin-bottom: 2rem;
                }

                .schedules-list h3 {
                    margin-bottom: 1rem;
                }

                .schedule-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1rem;
                }

                .schedule-card {
                    padding: 1rem;
                    background: var(--bg-secondary);
                    border: 2px solid var(--border-color);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }

                .schedule-card:hover {
                    border-color: var(--primary-color);
                    transform: translateY(-2px);
                }

                .schedule-card.selected {
                    border-color: var(--primary-color);
                    background: var(--primary-light);
                }

                .schedule-time {
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }

                .schedule-room, .schedule-instructor {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .attendance-form {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .attendance-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border-color);
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .attendance-stats h3 {
                    margin-bottom: 0.25rem;
                }

                .attendance-stats p {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }

                .bulk-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .reason-section {
                    margin-bottom: 1.5rem;
                }

                .reason-section label {
                    display: block;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    font-size: 0.875rem;
                }

                .reason-textarea {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-family: inherit;
                    resize: vertical;
                }

                .reason-textarea:focus {
                    outline: none;
                    border-color: var(--primary-color);
                }

                .validation-hint {
                    display: block;
                    color: #ea580c;
                    font-size: 0.75rem;
                    margin-top: 0.25rem;
                }

                .students-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                }

                .student-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: var(--bg-secondary);
                    border-radius: 6px;
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .student-info {
                    flex: 1;
                    min-width: 200px;
                }

                .student-name {
                    font-weight: 500;
                    margin-bottom: 0.25rem;
                }

                .student-roll {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .status-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .status-btn {
                    padding: 0.5rem 1rem;
                    border: 2px solid currentColor;
                    background: transparent;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    opacity: 0.5;
                }

                .status-btn.active {
                    opacity: 1;
                    background: currentColor;
                    color: white;
                }

                .status-btn:hover {
                    opacity: 0.8;
                }

                .badge-success {
                    color: #16a34a;
                }

                .badge-danger {
                    color: #dc2626;
                }

                .badge-warning {
                    color: #ea580c;
                }

                .badge-info {
                    color: #2563eb;
                }

                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border-color);
                }

                .btn {
                    padding: 0.625rem 1.25rem;
                    border: none;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-primary {
                    background: var(--primary-color);
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: var(--primary-dark);
                }

                .btn-success {
                    background: #16a34a;
                    color: white;
                }

                .btn-success:hover {
                    background: #15803d;
                }

                .btn-secondary {
                    background: #6b7280;
                    color: white;
                }

                .btn-secondary:hover {
                    background: #4b5563;
                }

                .btn-lg {
                    padding: 0.75rem 1.5rem;
                    font-size: 1rem;
                }

                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .loading-spinner, .empty-state {
                    text-align: center;
                    padding: 3rem;
                    color: var(--text-secondary);
                }

                @media (max-width: 768px) {
                    .mark-attendance-page {
                        padding: 1rem;
                    }

                    .attendance-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .student-row {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .status-buttons {
                        width: 100%;
                    }

                    .status-btn {
                        flex: 1;
                    }
                }
            `}</style>
        </div>
    );
}
