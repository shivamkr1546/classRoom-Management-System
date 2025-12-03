import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import axios from '../../utils/axios';
import { useToast } from '../../context/ToastContext';

const CourseForm = ({ isOpen, onClose, course, onSuccess }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [instructors, setInstructors] = useState([]);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        required_capacity: '',
        instructor_ids: []
    });

    useEffect(() => {
        fetchInstructors();
    }, []);

    useEffect(() => {
        if (course) {
            setFormData({
                code: course.code,
                name: course.name,
                required_capacity: course.required_capacity || 0,
                instructor_ids: course.instructors ? course.instructors.map(i => i.id) : []
            });
        } else {
            setFormData({
                code: '',
                name: '',
                required_capacity: '',
                instructor_ids: []
            });
        }
    }, [course, isOpen]);

    const fetchInstructors = async () => {
        try {
            const response = await axios.get('/users', {
                params: { role: 'instructor', limit: 100 }
            });
            setInstructors(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch instructors:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleInstructorChange = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
        setFormData(prev => ({
            ...prev,
            instructor_ids: selectedOptions
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                code: formData.code,
                name: formData.name,
                required_capacity: parseInt(formData.required_capacity) || 0
            };

            let courseId;

            if (course) {
                await axios.put(`/courses/${course.id}`, payload);
                courseId = course.id;
                showToast('Course updated successfully', 'success');
            } else {
                const response = await axios.post('/courses', payload);
                courseId = response.data.data.id;
                showToast('Course created successfully', 'success');
            }

            // Handle instructor assignments
            if (courseId) {
                // Get current assignments if editing
                const currentInstructorIds = course?.instructors ? course.instructors.map(i => i.id) : [];
                const newInstructorIds = formData.instructor_ids;

                // Assign new instructors
                const toAssign = newInstructorIds.filter(id => !currentInstructorIds.includes(id));
                for (const id of toAssign) {
                    await axios.post(`/courses/${courseId}/instructors/${id}`);
                }

                // Unassign removed instructors (only in edit mode)
                if (course) {
                    const toUnassign = currentInstructorIds.filter(id => !newInstructorIds.includes(id));
                    for (const id of toUnassign) {
                        await axios.delete(`/courses/${courseId}/instructors/${id}`);
                    }
                } else {
                    // For new course, just assign all selected
                    // The loop above already handles this because currentInstructorIds is empty
                }
            }

            onSuccess();
            onClose();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to save course';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={course ? 'Edit Course' : 'Add New Course'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Course Code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="e.g. CS101"
                    required
                />

                <Input
                    label="Course Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Introduction to Computer Science"
                    required
                />

                <Input
                    label="Required Capacity"
                    name="required_capacity"
                    type="number"
                    min="0"
                    value={formData.required_capacity}
                    onChange={handleChange}
                    placeholder="e.g. 60"
                />

                <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Select Instructors
                    </label>
                    <select
                        multiple
                        name="instructor_ids"
                        value={formData.instructor_ids}
                        onChange={handleInstructorChange}
                        className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 h-32"
                    >
                        {instructors.map(instructor => (
                            <option key={instructor.id} value={instructor.id}>
                                {instructor.name} ({instructor.email})
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-secondary-500 mt-1">Hold Ctrl (Windows) or Cmd (Mac) to select multiple instructors.</p>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        loading={loading}
                    >
                        {course ? 'Update Course' : 'Create Course'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default CourseForm;
