import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/axios';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import UserModal from '../components/users/UserModal';
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

const Users = () => {
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });
    const [search, setSearch] = useState('');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        fetchUsers(controller.signal);
        return () => controller.abort();
    }, [pagination.page, search]);

    const fetchUsers = async (signal) => {
        setLoading(true);
        try {
            const response = await axios.get('/users', {
                params: {
                    page: pagination.page,
                    limit: pagination.limit,
                    search: search
                },
                signal
            });

            setUsers(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                totalPages: response.data.pagination?.totalPages || 0
            }));
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error('Failed to fetch users:', error);
                showToast('Failed to load users', 'error');
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleAddUser = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleModalSubmit = async (formData) => {
        setActionLoading(true);
        try {
            if (selectedUser) {
                await axios.put(`/users/${selectedUser.id}`, formData);
                showToast('User updated successfully', 'success');
            } else {
                await axios.post('/users', formData);
                showToast('User created successfully', 'success');
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error('Failed to save user:', error);
            showToast(error.response?.data?.message || 'Failed to save user', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;
        setActionLoading(true);
        try {
            await axios.delete(`/users/${userToDelete.id}`);
            showToast('User deleted successfully', 'success');
            setIsDeleteModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error('Failed to delete user:', error);
            showToast(error.response?.data?.message || 'Failed to delete user', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    if (currentUser && currentUser.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full py-12">
                <h2 className="text-2xl font-bold text-secondary-900 mb-2">Access Denied</h2>
                <p className="text-secondary-600">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-secondary-900">Users Management</h1>
                <button
                    onClick={handleAddUser}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors"
                >
                    <Plus size={20} />
                    Add User
                </button>
            </div>

            <Card>
                <Card.Header>
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-secondary-900">All Users</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                className="pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={search}
                                onChange={handleSearch}
                            />
                        </div>
                    </div>
                </Card.Header>
                <Card.Body>
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-secondary-200">
                                <thead className="bg-secondary-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-secondary-200">
                                    {users.length > 0 ? (
                                        users.map((user) => (
                                            <tr key={user.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-secondary-900">{user.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-secondary-500">{user.email}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                            user.role === 'coordinator' ? 'bg-green-100 text-green-800' :
                                                                'bg-blue-100 text-blue-800'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {user.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleEditUser(user)}
                                                        className="text-primary-600 hover:text-primary-900 mr-4"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(user)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-4 text-center text-sm text-secondary-500">
                                                No users found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && users.length > 0 && (
                        <div className="mt-4">
                            <Pagination
                                currentPage={pagination.page}
                                totalPages={pagination.totalPages}
                                onPageChange={handlePageChange}
                                totalItems={pagination.total}
                            />
                        </div>
                    )}
                </Card.Body>
            </Card>

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                user={selectedUser}
                onSubmit={handleModalSubmit}
                isLoading={actionLoading}
            />

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={userToDelete?.name}
                loading={actionLoading}
            />
        </div>
    );
};

export default Users;
