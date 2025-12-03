import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import axios from '../../utils/axios';
import { useToast } from '../../context/ToastContext';

const StudentForm = ({ isOpen, onClose, student, onSuccess }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        roll_no: '',
        name: '',
        email: '',
        class_label: ''
    });

    useEffect(() => {
        if (student) {
            setFormData({
                roll_no: student.roll_no,
                name: student.name,
                email: student.email || '',
                class_label: student.class_label || ''
            });
        } else {
            setFormData({
                roll_no: '',
                name: '',
                email: '',
                class_label: ''
            });
        }
    }, [student, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (student) {
                await axios.put(`/students/${student.id}`, formData);
                showToast('Student updated successfully', 'success');
            } else {
                await axios.post('/students', formData);
                showToast('Student created successfully', 'success');
            }
            onSuccess();
            onClose();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to save student';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={student ? 'Edit Student' : 'Add New Student'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Roll Number"
                    name="roll_no"
                    value={formData.roll_no}
                    onChange={handleChange}
                    placeholder="e.g. CS2023001"
                    required
                />

                <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Jane Doe"
                    required
                />

                <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. jane.doe@student.edu"
                />

                <Input
                    label="Class / Section"
                    name="class_label"
                    value={formData.class_label}
                    onChange={handleChange}
                    placeholder="e.g. CS-A"
                />

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
                        {student ? 'Update Student' : 'Create Student'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default StudentForm;
