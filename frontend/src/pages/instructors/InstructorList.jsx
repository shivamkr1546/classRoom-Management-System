import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import axios from '../../utils/axios';
import { useToast } from '../../context/ToastContext';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';
import EmptyState from '../../components/ui/EmptyState';
import InstructorForm from './InstructorForm';

const InstructorList = () => {
    const { showToast } = useToast();
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingInstructor, setEditingInstructor] = useState(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [instructorToDelete, setInstructorToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchInstructors = useCallback(async (signal) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 10,
                search,
                role: 'instructor'
            };
            const response = await axios.get('/users', { params, signal });
            setInstructors(response.data.data || []);
            setTotalPages(response.data.pagination?.totalPages || 1);
            setTotalItems(response.data.pagination?.total || 0);
        } catch (error) {
            if (!axios.isCancel(error)) {
                showToast('Failed to fetch instructors', 'error');
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [page, search, showToast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchInstructors(controller.signal);
        return () => controller.abort();
    }, [fetchInstructors]);

    const handleCreate = () => {
        setEditingInstructor(null);
        setIsFormOpen(true);
    };

    const handleEdit = (instructor) => {
        setEditingInstructor(instructor);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (instructor) => {
        setInstructorToDelete(instructor);
        setIsDeleteOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!instructorToDelete) return;
        setDeleteLoading(true);
        try {
            await axios.delete(`/users/${instructorToDelete.id}`);
            showToast('Instructor deleted successfully', 'success');
            fetchInstructors();
            setIsDeleteOpen(false);
        } catch (error) {
            showToast('Failed to delete instructor', 'error');
        } finally {
            setDeleteLoading(false);
            setInstructorToDelete(null);
        }
    };

    const columns = [
        { label: 'Name', key: 'name' },
        { label: 'Email', key: 'email' },
        {
            label: 'Role',
            key: 'role',
            render: (value) => <span className="capitalize px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{value}</span>
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-secondary-900">Instructors</h1>
                <Button onClick={handleCreate} icon={Plus}>
                    Add Instructor
                </Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-secondary-200">
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search instructors..."
                />
            </div>

            {loading ? (
                <Table loading={true} columns={columns} />
            ) : instructors.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="No instructors found"
                    message={search ? "Try adjusting your search" : "Get started by adding your first instructor"}
                    actionLabel={search ? "Clear Search" : "Add Instructor"}
                    onAction={search ? () => setSearch('') : handleCreate}
                />
            ) : (
                <>
                    <Table
                        columns={columns}
                        data={instructors}
                        actions={(instructor) => (
                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Pencil}
                                    onClick={(e) => { e.stopPropagation(); handleEdit(instructor); }}
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Trash2}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(instructor); }}
                                />
                            </div>
                        )}
                    />
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        totalItems={totalItems}
                    />
                </>
            )}

            <InstructorForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                instructor={editingInstructor}
                onSuccess={fetchInstructors}
            />

            <DeleteConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Instructor"
                itemName={instructorToDelete?.name}
                loading={deleteLoading}
            />
        </div>
    );
};

export default InstructorList;
