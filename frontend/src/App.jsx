import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/layout/ErrorBoundary';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './utils/ProtectedRoute';
import ToastContainer from './components/ui/Toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import { useAuth } from './context/AuthContext';
import { RoomList } from './pages/rooms';
import { CourseList } from './pages/courses';
import { InstructorList } from './pages/instructors';
import { StudentList } from './pages/students';
import { ScheduleList } from './pages/schedules';
import { MarkAttendance, AttendanceReport } from './pages/attendance';
import { UtilizationCharts, PeakHourHeatmap, LiveRoomAvailability } from './pages/analytics';
import { ROLES } from './utils/constants';

function App() {
    const { user } = useAuth();

    return (
        <ErrorBoundary>
            <ToastContainer />

            <Routes>
                {/* Public routes */}
                <Route
                    path="/login"
                    element={user ? <Navigate to="/dashboard" replace /> : <Login />}
                />

                {/* Root redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Protected routes */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <Dashboard />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/users"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <Users />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/instructors"
                    element={
                        <ProtectedRoute requiredRoles={[ROLES.ADMIN]}>
                            <MainLayout>
                                <InstructorList />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/rooms"
                    element={
                        <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.COORDINATOR]}>
                            <MainLayout>
                                <RoomList />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/courses"
                    element={
                        <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.COORDINATOR]}>
                            <MainLayout>
                                <CourseList />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/students"
                    element={
                        <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.COORDINATOR]}>
                            <MainLayout>
                                <StudentList />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/schedules"
                    element={
                        <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.COORDINATOR]}>
                            <MainLayout>
                                <ScheduleList />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Attendance routes */}
                <Route
                    path="/attendance/mark"
                    element={
                        <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.COORDINATOR]}>
                            <MainLayout>
                                <MarkAttendance />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/attendance/report"
                    element={
                        <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.COORDINATOR, ROLES.INSTRUCTOR]}>
                            <MainLayout>
                                <AttendanceReport />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Analytics routes */}
                <Route
                    path="/analytics/utilization"
                    element={
                        <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.COORDINATOR, ROLES.INSTRUCTOR]}>
                            <MainLayout>
                                <UtilizationCharts />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/analytics/heatmap"
                    element={
                        <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.COORDINATOR, ROLES.INSTRUCTOR]}>
                            <MainLayout>
                                <PeakHourHeatmap />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/analytics/live-rooms"
                    element={
                        <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.COORDINATOR, ROLES.INSTRUCTOR]}>
                            <MainLayout>
                                <LiveRoomAvailability />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* Unauthorized page */}
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* 404 page */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </ErrorBoundary>
    );
}

export default App;
