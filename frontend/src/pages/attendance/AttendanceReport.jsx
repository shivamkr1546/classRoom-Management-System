import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import DateRangePicker from '../../components/ui/DateRangePicker';
import CSVExportButton from '../../components/ui/CSVExportButton';
import { format } from 'date-fns';

/**
 * AttendanceReport Component
 * View attendance statistics with filters and CSV export
 * Accessible to Instructor/Coordinator/Admin roles
 */
export default function AttendanceReport() {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [dateRange, setDateRange] = useState({
        startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            fetchReport();
        }
    }, [selectedCourse, dateRange]);

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

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/analytics/courses/${selectedCourse}/attendance`, {
                params: {
                    start_date: dateRange.startDate,
                    end_date: dateRange.endDate
                }
            });
            setReportData(response.data.data);
        } catch (error) {
            console.error('Failed to fetch attendance report:', error);
            if (window.showToast) {
                window.showToast('Failed to load attendance report', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const prepareCSVData = () => {
        if (!reportData || !reportData.schedules) return [];

        return reportData.schedules.map(schedule => ({
            Date: format(new Date(schedule.date), 'yyyy-MM-dd'),
            Day: format(new Date(schedule.date), 'EEEE'),
            StartTime: schedule.start_time,
            EndTime: schedule.end_time,
            EnrolledStudents: schedule.enrolled_count,
            TotalAttendance: schedule.total_attendance,
            Present: schedule.present_count,
            Absent: schedule.absent_count,
            Late: schedule.late_count,
            Excused: schedule.excused_count,
            AttendanceRate: `${schedule.attendance_rate}%`
        }));
    };

    const getStatusBadgeClass = (rate) => {
        if (rate >= 80) return 'badge-success';
        if (rate >= 60) return 'badge-warning';
        return 'badge-danger';
    };

    const selectedCourseData = courses.find(c => c.id === parseInt(selectedCourse));

    return (
        <div className="attendance-report-page">
            <div className="page-header">
                <h1>Attendance Reports</h1>
                <p>View and export attendance statistics by course</p>
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

                <DateRangePicker
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    onChange={setDateRange}
                />
            </div>

            {loading && (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading attendance data...</p>
                </div>
            )}

            {!loading && reportData && (
                <div className="report-container">
                    <div className="report-header">
                        <div className="report-summary">
                            <h2>{selectedCourseData?.code} - {selectedCourseData?.name}</h2>
                            <div className="summary-stats">
                                <div className="stat-card">
                                    <div className="stat-label">Enrolled Students</div>
                                    <div className="stat-value">{reportData.enrolledCount}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Total Classes</div>
                                    <div className="stat-value">{reportData.totalSchedules}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Average Attendance</div>
                                    <div className="stat-value">{reportData.averageAttendanceRate}%</div>
                                </div>
                            </div>
                        </div>
                        <div className="export-actions">
                            <CSVExportButton
                                data={prepareCSVData()}
                                filename={`attendance_${selectedCourseData?.code}_${dateRange.startDate}_${dateRange.endDate}`}
                            />
                        </div>
                    </div>

                    <div className="report-table-container">
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th>Time</th>
                                    <th>Enrolled</th>
                                    <th>Present</th>
                                    <th>Absent</th>
                                    <th>Late</th>
                                    <th>Excused</th>
                                    <th>Attendance %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.schedules.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="empty-row">
                                            No attendance records found for this date range
                                        </td>
                                    </tr>
                                ) : (
                                    reportData.schedules.map(schedule => (
                                        <tr key={schedule.schedule_id}>
                                            <td>{format(new Date(schedule.date), 'MMM dd, yyyy')}</td>
                                            <td>{format(new Date(schedule.date), 'EEEE')}</td>
                                            <td>
                                                {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                                            </td>
                                            <td>{schedule.enrolled_count}</td>
                                            <td className="status-present">{schedule.present_count}</td>
                                            <td className="status-absent">{schedule.absent_count}</td>
                                            <td className="status-late">{schedule.late_count}</td>
                                            <td className="status-excused">{schedule.excused_count}</td>
                                            <td>
                                                <span className={`badge ${getStatusBadgeClass(schedule.attendance_rate)}`}>
                                                    {schedule.attendance_rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!loading && !selectedCourse && (
                <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <p>Select a course to view attendance reports</p>
                </div>
            )}

            <style jsx>{`
                .attendance-report-page {
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
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
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

                .loading-spinner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    gap: 1rem;
                }

                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 4px solid var(--border-color);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .report-container {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    overflow: hidden;
                }

                .report-header {
                    padding: 1.5rem;
                    border-bottom: 2px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .report-summary h2 {
                    margin-bottom: 1rem;
                }

                .summary-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 1rem;
                }

                .stat-card {
                    padding: 1rem;
                    background: var(--bg-secondary);
                    border-radius: 6px;
                }

                .stat-label {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }

                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--primary-color);
                }

                .report-table-container {
                    overflow-x: auto;
                }

                .report-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .report-table thead {
                    background: var(--bg-secondary);
                }

                .report-table th {
                    padding: 1rem;
                    text-align: left;
                    font-weight: 600;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    border-bottom: 2px solid var(--border-color);
                }

                .report-table td {
                    padding: 1rem;
                    border-bottom: 1px solid var(--border-color);
                    font-size: 0.875rem;
                }

                .report-table tbody tr:hover {
                    background: var(--bg-secondary);
                }

                .empty-row {
                    text-align: center;
                    color: var(--text-secondary);
                    padding: 3rem 1rem !important;
                }

                .status-present {
                    color: #16a34a;
                    font-weight: 500;
                }

                .status-absent {
                    color: #dc2626;
                    font-weight: 500;
                }

                .status-late {
                    color: #ea580c;
                    font-weight: 500;
                }

                .status-excused {
                    color: #2563eb;
                    font-weight: 500;
                }

                .badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 12px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    display: inline-block;
                }

                .badge-success {
                    background: #dcfce7;
                    color: #15803d;
                }

                .badge-warning {
                    background: #fed7aa;
                    color: #c2410c;
                }

                .badge-danger {
                    background: #fee2e2;
                    color: #b91c1c;
                }

                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    color: var(--text-secondary);
                    gap: 1rem;
                }

                .empty-state svg {
                    opacity: 0.5;
                }

                @media (max-width: 768px) {
                    .attendance-report-page {
                        padding: 1rem;
                    }

                    .report-header {
                        flex-direction: column;
                    }

                    .summary-stats {
                        grid-template-columns: 1fr;
                    }

                    .report-table {
                        font-size: 0.75rem;
                    }

                    .report-table th,
                    .report-table td {
                        padding: 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
}
