import { useState, useEffect, useCallback } from 'react';
import { Plus, Filter } from 'lucide-react';
import axios from '../../utils/axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import { ScheduleGrid, ScheduleDetailPopup, ScheduleForm } from '../../components/schedule';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';
import { getWeekDates, formatDateForAPI } from '../../utils/scheduleUtils';
import { ROLES } from '../../utils/constants';

const ScheduleList = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [weekOffset, setWeekOffset] = useState(0);

    // Filter state
    const [filters, setFilters] = useState({
        room_id: '',
        course_id: '',
        instructor_id: '',
    });
    const [showFilters, setShowFilters] = useState(false);

    // Dropdown data for filters
    const [rooms, setRooms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [instructors, setInstructors] = useState([]);

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [selectedScheduleId, setSelectedScheduleId] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [formPrefill, setFormPrefill] = useState({});

    // Check if user can modify schedules
    const canModify = user?.role === ROLES.ADMIN || user?.role === ROLES.COORDINATOR;

    useEffect(() => {
        const controller = new AbortController();
        fetchSchedules(controller.signal);
        fetchFilterData(controller.signal);
        return () => controller.abort();
    }, [weekOffset, filters]);

    const fetchSchedules = async (signal) => {
        setLoading(true);
        try {
            const weekDates = getWeekDates(weekOffset);
            const params = {
                start_date: formatDateForAPI(weekDates[0]),
                end_date: formatDateForAPI(weekDates[4]),
                limit: 1000, // Get all schedules for the week
                ...filters,
            };

            // Remove empty filters
            Object.keys(params).forEach((key) => {
                if (params[key] === '') delete params[key];
            });

            const response = await axios.get('/schedules', { params, signal });
            setSchedules(response.data.data || []);
        } catch (error) {
            if (!axios.isCancel(error)) {
                showToast('Failed to fetch schedules', 'error');
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    };

    const fetchFilterData = async (signal) => {
        try {
            const [roomsRes, coursesRes, instructorsRes] = await Promise.all([
                axios.get('/rooms', { params: { limit: 100 }, signal }),
                axios.get('/courses', { params: { limit: 100 }, signal }),
                axios.get('/users', { params: { role: 'instructor', limit: 100 }, signal }),
            ]);

            setRooms(roomsRes.data.data || []);
            setCourses(coursesRes.data.data || []);
            setInstructors(instructorsRes.data.data || []);
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error('Failed to load filter data');
            }
        }
    };

    const handleCreateClick = () => {
        setSelectedSchedule(null);
        setFormPrefill({});
        setIsFormOpen(true);
    };

    const handleEmptySlotClick = (prefillData) => {
        if (!canModify) {
            showToast('Only admins and coordinators can create schedules', 'error');
            return;
        }
        setSelectedSchedule(null);
        setFormPrefill(prefillData);
        setIsFormOpen(true);
    };

    const handleBlockClick = (schedule) => {
        setSelectedScheduleId(schedule.id);
        setIsDetailOpen(true);
    };

    const handleEditFromDetail = (schedule) => {
        if (!canModify) {
            showToast('Only admins and coordinators can edit schedules', 'error');
            return;
        }
        setSelectedSchedule(schedule);
        setFormPrefill({});
        setIsFormOpen(true);
    };

    const handleDeleteClick = (schedule) => {
        if (!canModify) {
            showToast('Only admins and coordinators can cancel schedules', 'error');
            return;
        }
        setSelectedSchedule(schedule);
        setIsDeleteOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedSchedule) return;
        setDeleteLoading(true);
        try {
            await axios.delete(`/schedules/${selectedSchedule.id}`);
            showToast('Schedule cancelled successfully', 'success');
            fetchSchedules();
            setIsDeleteOpen(false);
        } catch (error) {
            showToast('Failed to cancel schedule', 'error');
        } finally {
            setDeleteLoading(false);
            setSelectedSchedule(null);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({ room_id: '', course_id: '', instructor_id: '' });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-secondary-900">Class Schedule</h1>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        icon={Filter}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        Filters
                    </Button>
                    {canModify && (
                        <Button onClick={handleCreateClick} icon={Plus}>
                            Add Schedule
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-secondary-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">
                                Room
                            </label>
                            <select
                                name="room_id"
                                value={filters.room_id}
                                onChange={handleFilterChange}
                                className="w-full border border-secondary-300 rounded-md px-3 py-2 text-sm"
                            >
                                <option value="">All Rooms</option>
                                {rooms.map((room) => (
                                    <option key={room.id} value={room.id}>
                                        {room.code} - {room.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">
                                Course
                            </label>
                            <select
                                name="course_id"
                                value={filters.course_id}
                                onChange={handleFilterChange}
                                className="w-full border border-secondary-300 rounded-md px-3 py-2 text-sm"
                            >
                                <option value="">All Courses</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.code} - {course.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">
                                Instructor
                            </label>
                            <select
                                name="instructor_id"
                                value={filters.instructor_id}
                                onChange={handleFilterChange}
                                className="w-full border border-secondary-300 rounded-md px-3 py-2 text-sm"
                            >
                                <option value="">All Instructors</option>
                                {instructors.map((instructor) => (
                                    <option key={instructor.id} value={instructor.id}>
                                        {instructor.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button variant="outline" onClick={clearFilters} className="w-full">
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Grid */}
            <ScheduleGrid
                schedules={schedules}
                onBlockClick={handleBlockClick}
                onEmptySlotClick={handleEmptySlotClick}
                loading={loading}
                weekOffset={weekOffset}
                onWeekChange={setWeekOffset}
            />

            {/* Modals */}
            <ScheduleForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                schedule={selectedSchedule}
                onSuccess={fetchSchedules}
                prefill={formPrefill}
            />

            <ScheduleDetailPopup
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                scheduleId={selectedScheduleId}
                onEdit={handleEditFromDetail}
                onDelete={handleDeleteClick}
                canModify={canModify}
            />

            <DeleteConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Cancel Schedule"
                itemName={selectedSchedule ? `${selectedSchedule.course_code} on ${selectedSchedule.date}` : ''}
                loading={deleteLoading}
            />
        </div>
    );
};

export default ScheduleList;
