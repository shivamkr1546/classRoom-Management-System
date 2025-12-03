import { NavLink } from 'react-router-dom';
import { Home, Users, Building, BookOpen, GraduationCap, Calendar, X, ClipboardCheck, BarChart3, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

const Sidebar = ({ isOpen, onClose }) => {
    const { user } = useAuth();

    const menuItems = [
        {
            label: 'Dashboard',
            path: '/dashboard',
            icon: Home,
            roles: [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.STUDENT],
        },
        {
            label: 'Users',
            path: '/users',
            icon: Users,
            roles: [ROLES.ADMIN],
        },
        {
            label: 'Instructors',
            path: '/instructors',
            icon: Users,
            roles: [ROLES.ADMIN],
        },
        {
            label: 'Students',
            path: '/students',
            icon: GraduationCap,
            roles: [ROLES.ADMIN, ROLES.COORDINATOR],
        },
        {
            label: 'Rooms',
            path: '/rooms',
            icon: Building,
            roles: [ROLES.ADMIN, ROLES.COORDINATOR],
        },
        {
            label: 'Courses',
            path: '/courses',
            icon: BookOpen,
            roles: [ROLES.ADMIN, ROLES.COORDINATOR],
        },

        {
            label: 'Schedules',
            path: '/schedules',
            icon: Calendar,
            roles: [ROLES.ADMIN, ROLES.COORDINATOR],
        },
        {
            label: 'Mark Attendance',
            path: '/attendance/mark',
            icon: ClipboardCheck,
            roles: [ROLES.ADMIN, ROLES.COORDINATOR],
        },
        {
            label: 'Attendance Reports',
            path: '/attendance/report',
            icon: ClipboardCheck,
            roles: [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.INSTRUCTOR],
        },
        {
            label: 'Utilization Charts',
            path: '/analytics/utilization',
            icon: BarChart3,
            roles: [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.INSTRUCTOR],
        },
        {
            label: 'Peak Hour Heatmap',
            path: '/analytics/heatmap',
            icon: BarChart3,
            roles: [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.INSTRUCTOR],
        },
        {
            label: 'Live Room Status',
            path: '/analytics/live-rooms',
            icon: Activity,
            roles: [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.INSTRUCTOR],
        },
    ];

    // Filter menu items based on user role
    const visibleItems = menuItems.filter((item) =>
        item.roles.includes(user?.role)
    );

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white border-r border-secondary-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <div className="h-full flex flex-col">
                    {/* Mobile close button */}
                    <div className="lg:hidden flex justify-end p-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-secondary-100 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1">
                        {visibleItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-primary-50 text-primary-700 font-medium'
                                        : 'text-secondary-700 hover:bg-secondary-50'
                                    }`
                                }
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-secondary-200">
                        <p className="text-xs text-secondary-500 text-center">
                            Version 1.0.0
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
