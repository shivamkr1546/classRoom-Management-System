import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import axios from '../../utils/axios';
import { useToast } from '../../context/ToastContext';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';
import EmptyState from '../../components/ui/EmptyState';
import CourseForm from './CourseForm';

const CourseList = () => {
    const { showToast } = useToast();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchCourses = useCallback(async (signal) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 10,
                search
            };
            const response = await axios.get('/courses', { params, signal });
            setCourses(response.data.data || []);
            setTotalPages(response.data.pagination?.totalPages || 1);
            setTotalItems(response.data.pagination?.total || 0);
        } catch (error) {
            if (!axios.isCancel(error)) {
                showToast('Failed to fetch courses', 'error');
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [page, search, showToast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchCourses(controller.signal);
        return () => controller.abort();
    }, [fetchCourses]);

    const handleCreate = () => {
        setEditingCourse(null);
        setIsFormOpen(true);
    };

    const handleEdit = (course) => {
        setEditingCourse(course);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (course) => {
        setCourseToDelete(course);
        setIsDeleteOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!courseToDelete) return;
        setDeleteLoading(true);
        try {
            await axios.delete(`/courses/${courseToDelete.id}`);
            showToast('Course deleted successfully', 'success');
            fetchCourses();
            setIsDeleteOpen(false);
        } catch (error) {
            showToast('Failed to delete course', 'error');
        } finally {
            setDeleteLoading(false);
            setCourseToDelete(null);
        }
    };

    const columns = [
        { label: 'Code', key: 'code' },
        { label: 'Name', key: 'name' },
        { label: 'Required Capacity', key: 'required_capacity' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-secondary-900">Courses</h1>
                <Button onClick={handleCreate} icon={Plus}>
                    Add Course
                </Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-secondary-200">
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search courses..."
                />
            </div>

            {loading ? (
                <Table loading={true} columns={columns} />
            ) : courses.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="No courses found"
                    message={search ? "Try adjusting your search" : "Get started by creating your first course"}
                    actionLabel={search ? "Clear Search" : "Create Course"}
                    onAction={search ? () => setSearch('') : handleCreate}
                />
            ) : (
                <>
                    <Table
                        columns={columns}
                        data={courses}
                        actions={(course) => (
                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Pencil}
                                    onClick={(e) => { e.stopPropagation(); handleEdit(course); }}
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Trash2}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(course); }}
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

            <CourseForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                course={editingCourse}
                onSuccess={fetchCourses}
            />

            <DeleteConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Course"
                itemName={courseToDelete?.name}
                loading={deleteLoading}
            />
        </div>
    );
};

export default CourseList;
