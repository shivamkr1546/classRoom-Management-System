import { useState } from 'react';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <nav className="bg-white border-b border-secondary-200 px-4 py-3">
            <div className="flex items-center justify-between">
                {/* Left section */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 rounded-lg hover:bg-secondary-100 transition-colors"
                    >
                        <Menu size={24} />
                    </button>

                    <h1 className="text-xl font-bold text-primary-600">
                        Classroom Management
                    </h1>
                </div>

                {/* Right section */}
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary-100 transition-colors"
                    >
                        <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-medium">
                            {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-medium text-secondary-900">{user?.name || user?.email}</p>
                            <p className="text-xs text-secondary-500 capitalize">{user?.role}</p>
                        </div>
                    </button>

                    {/* Dropdown */}
                    {showDropdown && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowDropdown(false)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-secondary-200 py-1 z-20 animate-slide-in">
                                <div className="px-4 py-2 border-b border-secondary-200">
                                    <p className="text-sm font-medium text-secondary-900">{user?.name || user?.email}</p>
                                    <p className="text-xs text-secondary-500">{user?.email}</p>
                                    <p className="text-xs text-primary-600 capitalize mt-1">{user?.role}</p>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
