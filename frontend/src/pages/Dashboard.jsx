import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from '../utils/axios';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import { Users, Building, BookOpen, GraduationCap } from 'lucide-react';

const Dashboard = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            const response = await axios.get('/analytics/summary');
            setStats(response.data.data);
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
            showToast('Failed to load dashboard statistics', 'error');
        } finally {
            setLoading(false);
        }
    };

    const statsConfig = [
        {
            label: 'Total Users',
            value: stats?.totalUsers || 0,
            icon: Users,
            color: 'bg-blue-500',
            visible: user?.role === 'admin',
        },
        {
            label: 'Total Rooms',
            value: stats?.totalRooms || 0,
            icon: Building,
            color: 'bg-green-500',
            visible: true,
        },
        {
            label: 'Total Courses',
            value: stats?.totalCourses || 0,
            icon: BookOpen,
            color: 'bg-purple-500',
            visible: true,
        },
        {
            label: 'Total Students',
            value: stats?.totalStudents || 0,
            icon: GraduationCap,
            color: 'bg-orange-500',
            visible: true,
        },
    ].filter(stat => stat.visible);

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div>
                <h1 className="text-3xl font-bold text-secondary-900">
                    Welcome back, {user?.name || user?.email}!
                </h1>
                <p className="text-secondary-600 mt-1">
                    You are logged in as <span className="font-medium capitalize">{user?.role}</span>
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                    // Loading skeletons
                    statsConfig.map((_, index) => (
                        <Card key={index}>
                            <Card.Body>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <Skeleton className="h-4 w-24 mb-2" />
                                        <Skeleton className="h-8 w-16" />
                                    </div>
                                    <Skeleton className="h-12 w-12 rounded-lg" />
                                </div>
                            </Card.Body>
                        </Card>
                    ))
                ) : (
                    // Actual stats
                    statsConfig.map((stat, index) => (
                        <Card key={index}>
                            <Card.Body>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-secondary-600 mb-1">{stat.label}</p>
                                        <p className="text-3xl font-bold text-secondary-900">{stat.value}</p>
                                    </div>
                                    <div className={`${stat.color} p-3 rounded-lg`}>
                                        <stat.icon className="text-white" size={24} />
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    ))
                )}
            </div>

            {/* Info Card */}
            <Card>
                <Card.Header>
                    <h2 className="text-xl font-semibold text-secondary-900">Getting Started</h2>
                </Card.Header>
                <Card.Body>
                    <div className="prose max-w-none">
                        <p className="text-secondary-700 mb-4">
                            Welcome to the Classroom Management System. Use the sidebar to navigate between different sections.
                        </p>

                        {user?.role === 'admin' && (
                            <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                                <h3 className="font-semibold text-primary-900 mb-2">Admin Privileges</h3>
                                <ul className="list-disc list-inside text-primary-800 space-y-1">
                                    <li>Manage all users, rooms, courses, and students</li>
                                    <li>Full access to all system features</li>
                                    <li>View and modify all schedules</li>
                                </ul>
                            </div>
                        )}

                        {user?.role === 'coordinator' && (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h3 className="font-semibold text-green-900 mb-2">Coordinator Privileges</h3>
                                <ul className="list-disc list-inside text-green-800 space-y-1">
                                    <li>Manage rooms, courses, and students</li>
                                    <li>Create and modify schedules</li>
                                    <li>View analytics and reports</li>
                                </ul>
                            </div>
                        )}

                        {user?.role === 'student' && (
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <h3 className="font-semibold text-purple-900 mb-2">Student Access</h3>
                                <ul className="list-disc list-inside text-purple-800 space-y-1">
                                    <li>View your courses and schedules</li>
                                    <li>Access course materials</li>
                                    <li>Track your progress</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Dashboard;
