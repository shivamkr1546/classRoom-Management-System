import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import axios from '../../utils/axios';
import { useToast } from '../../context/ToastContext';

const InstructorForm = ({ isOpen, onClose, instructor, onSuccess }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    useEffect(() => {
        if (instructor) {
            setFormData({
                name: instructor.name,
                email: instructor.email,
                password: '' // Password cannot be edited here
            });
        } else {
            setFormData({
                name: '',
                email: '',
                password: ''
            });
        }
    }, [instructor, isOpen]);

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
            if (instructor) {
                // Update existing instructor
                const payload = {
                    name: formData.name,
                    email: formData.email
                };
                await axios.put(`/users/${instructor.id}`, payload);
                showToast('Instructor updated successfully', 'success');
            } else {
                // Create new instructor
                const payload = {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    role: 'instructor'
                };
                await axios.post('/users', payload);
                showToast('Instructor created successfully', 'success');
            }
            onSuccess();
            onClose();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to save instructor';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={instructor ? 'Edit Instructor' : 'Add New Instructor'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Dr. John Smith"
                    required
                />

                <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. john.smith@university.edu"
                    required
                />

                {!instructor && (
                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min. 6 characters"
                        required
                        minLength={6}
                    />
                )}

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
                        {instructor ? 'Update Instructor' : 'Create Instructor'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default InstructorForm;
