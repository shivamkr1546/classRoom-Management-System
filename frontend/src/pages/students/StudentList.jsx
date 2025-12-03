import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, GraduationCap } from 'lucide-react';
import axios from '../../utils/axios';
import { useToast } from '../../context/ToastContext';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';
import EmptyState from '../../components/ui/EmptyState';
import StudentForm from './StudentForm';

const StudentList = () => {
    const { showToast } = useToast();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchStudents = useCallback(async (signal) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 10,
                search
            };
            const response = await axios.get('/students', { params, signal });
            setStudents(response.data.data || []);
            setTotalPages(response.data.pagination?.totalPages || 1);
            setTotalItems(response.data.pagination?.total || 0);
        } catch (error) {
            if (!axios.isCancel(error)) {
                showToast('Failed to fetch students', 'error');
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [page, search, showToast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchStudents(controller.signal);
        return () => controller.abort();
    }, [fetchStudents]);

    const handleCreate = () => {
        setEditingStudent(null);
        setIsFormOpen(true);
    };

    const handleEdit = (student) => {
        setEditingStudent(student);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (student) => {
        setStudentToDelete(student);
        setIsDeleteOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!studentToDelete) return;
        setDeleteLoading(true);
        try {
            await axios.delete(`/students/${studentToDelete.id}`);
            showToast('Student deleted successfully', 'success');
            fetchStudents();
            setIsDeleteOpen(false);
        } catch (error) {
            showToast('Failed to delete student', 'error');
        } finally {
            setDeleteLoading(false);
            setStudentToDelete(null);
        }
    };

    const columns = [
        { label: 'Roll No', key: 'roll_no' },
        { label: 'Name', key: 'name' },
        { label: 'Email', key: 'email' },
        { label: 'Class', key: 'class_label' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-secondary-900">Students</h1>
                <Button onClick={handleCreate} icon={Plus}>
                    Add Student
                </Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-secondary-200">
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search students..."
                />
            </div>

            {loading ? (
                <Table loading={true} columns={columns} />
            ) : students.length === 0 ? (
                <EmptyState
                    icon={GraduationCap}
                    title="No students found"
                    message={search ? "Try adjusting your search" : "Get started by adding your first student"}
                    actionLabel={search ? "Clear Search" : "Add Student"}
                    onAction={search ? () => setSearch('') : handleCreate}
                />
            ) : (
                <>
                    <Table
                        columns={columns}
                        data={students}
                        actions={(student) => (
                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Pencil}
                                    onClick={(e) => { e.stopPropagation(); handleEdit(student); }}
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Trash2}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(student); }}
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

            <StudentForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                student={editingStudent}
                onSuccess={fetchStudents}
            />

            <DeleteConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Student"
                itemName={studentToDelete?.name}
                loading={deleteLoading}
            />
        </div>
    );
};

export default StudentList;
