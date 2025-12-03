import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import axios from '../../utils/axios';
import { useToast } from '../../context/ToastContext';
import { formatTimeForInput, formatTimeForAPI, formatDateForAPI, isTimeValid } from '../../utils/scheduleUtils';

/**
 * ScheduleForm Component
 * Modal form for creating/editing schedules with validation and conflict detection
 */
const ScheduleForm = ({ isOpen, onClose, schedule, onSuccess, prefill = {} }) => {
    const { showToast } = useToast();
    const isEdit = Boolean(schedule);

    const [formData, setFormData] = useState({
        room_id: '',
        course_id: '',
        instructor_id: '',
        date: '',
        start_time: '',
        end_time: '',
    });

    const [rooms, setRooms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [conflictErrors, setConflictErrors] = useState([]);

    useEffect(() => {
        const controller = new AbortController();

        if (isOpen) {
            fetchDropdownData(controller.signal);
            if (schedule) {
                // Edit mode - populate form
                setFormData({
                    room_id: schedule.room_id,
                    course_id: schedule.course_id,
                    instructor_id: schedule.instructor_id,
                    date: schedule.date,
                    start_time: formatTimeForInput(schedule.start_time),
                    end_time: formatTimeForInput(schedule.end_time),
                });
            } else if (prefill.date || prefill.start_time) {
                // Pre-fill from empty slot click
                setFormData({
                    ...formData,
                    date: prefill.date || '',
                    start_time: prefill.start_time || '',
                    end_time: prefill.end_time || '',
                });
            } else {
                // Reset form
                resetForm();
            }
            setErrors({});
            setConflictErrors([]);
        }

        return () => controller.abort();
    }, [isOpen, schedule, prefill]);

    const resetForm = () => {
        setFormData({
            room_id: '',
            course_id: '',
            instructor_id: '',
            date: '',
            start_time: '',
            end_time: '',
        });
    };

    const fetchDropdownData = async (signal) => {
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
                showToast('Failed to load form data', 'error');
            }
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        // Clear error for this field
        setErrors((prev) => ({ ...prev, [name]: '' }));
        setConflictErrors([]);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.room_id) newErrors.room_id = 'Room is required';
        if (!formData.course_id) newErrors.course_id = 'Course is required';
        if (!formData.instructor_id) newErrors.instructor_id = 'Instructor is required';
        if (!formData.date) newErrors.date = 'Date is required';
        if (!formData.start_time) newErrors.start_time = 'Start time is required';
        if (!formData.end_time) newErrors.end_time = 'End time is required';

        // Date validation - cannot be in the past
        if (formData.date) {
            const selectedDate = new Date(formData.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                newErrors.date = 'Date cannot be in the past';
            }
        }

        // Time validation
        if (formData.start_time && formData.end_time) {
            const startWithSeconds = formatTimeForAPI(formData.start_time);
            const endWithSeconds = formatTimeForAPI(formData.end_time);
            if (!isTimeValid(startWithSeconds, endWithSeconds)) {
                newErrors.end_time = 'End time must be after start time';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setConflictErrors([]);

        try {
            const payload = {
                room_id: parseInt(formData.room_id),
                course_id: parseInt(formData.course_id),
                instructor_id: parseInt(formData.instructor_id),
                date: formData.date,
                start_time: formatTimeForAPI(formData.start_time),
                end_time: formatTimeForAPI(formData.end_time),
            };

            if (isEdit) {
                await axios.put(`/schedules/${schedule.id}`, payload);
                showToast('Schedule updated successfully', 'success');
            } else {
                await axios.post('/schedules', payload);
                showToast('Schedule created successfully', 'success');
            }

            onSuccess();
            onClose();
        } catch (error) {
            if (error.response?.status === 409) {
                // Conflict error from backend
                const errorData = error.response.data;
                if (errorData.errors && Array.isArray(errorData.errors)) {
                    setConflictErrors(errorData.errors);
                } else {
                    showToast(errorData.message || 'Schedule conflict detected', 'error');
                }
            } else {
                showToast('Failed to save schedule', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Schedule' : 'Create Schedule'}
            size="lg"
            footer={
                <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Conflict Errors */}
                {conflictErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="font-semibold text-red-800 mb-2">
                            ⚠️ Schedule Conflicts Detected
                        </div>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                            {conflictErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Room */}
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Room <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="room_id"
                            value={formData.room_id}
                            onChange={handleChange}
                            className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                        >
                            <option value="">Select Room</option>
                            {rooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                    {room.code} - {room.name} (Capacity: {room.capacity})
                                </option>
                            ))}
                        </select>
                        {errors.room_id && (
                            <p className="text-red-500 text-sm mt-1">{errors.room_id}</p>
                        )}
                    </div>

                    {/* Course */}
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Course <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="course_id"
                            value={formData.course_id}
                            onChange={handleChange}
                            className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                        >
                            <option value="">Select Course</option>
                            {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.code} - {course.name}
                                </option>
                            ))}
                        </select>
                        {errors.course_id && (
                            <p className="text-red-500 text-sm mt-1">{errors.course_id}</p>
                        )}
                    </div>

                    {/* Instructor */}
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Instructor <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="instructor_id"
                            value={formData.instructor_id}
                            onChange={handleChange}
                            className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                        >
                            <option value="">Select Instructor</option>
                            {instructors.map((instructor) => (
                                <option key={instructor.id} value={instructor.id}>
                                    {instructor.name}
                                </option>
                            ))}
                        </select>
                        {errors.instructor_id && (
                            <p className="text-red-500 text-sm mt-1">{errors.instructor_id}</p>
                        )}
                    </div>

                    {/* Date */}
                    <div>
                        <Input
                            label="Date"
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            error={errors.date}
                            required
                        />
                    </div>

                    {/* Start Time */}
                    <div>
                        <Input
                            label="Start Time"
                            type="time"
                            name="start_time"
                            value={formData.start_time}
                            onChange={handleChange}
                            error={errors.start_time}
                            required
                        />
                    </div>

                    {/* End Time */}
                    <div>
                        <Input
                            label="End Time"
                            type="time"
                            name="end_time"
                            value={formData.end_time}
                            onChange={handleChange}
                            error={errors.end_time}
                            required
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
};

ScheduleForm.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    schedule: PropTypes.object,
    onSuccess: PropTypes.func.isRequired,
    prefill: PropTypes.shape({
        date: PropTypes.string,
        start_time: PropTypes.string,
        end_time: PropTypes.string,
    }),
};

export default ScheduleForm;
