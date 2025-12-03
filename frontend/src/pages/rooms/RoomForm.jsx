import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import axios from '../../utils/axios';
import { useToast } from '../../context/ToastContext';

const RoomForm = ({ isOpen, onClose, room, onSuccess }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'classroom',
        capacity: '',
        location: ''
    });

    useEffect(() => {
        if (room) {
            setFormData({
                code: room.code,
                name: room.name,
                type: room.type,
                capacity: room.capacity,
                location: room.location || ''
            });
        } else {
            setFormData({
                code: '',
                name: '',
                type: 'classroom',
                capacity: '',
                location: ''
            });
        }
    }, [room, isOpen]);

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
            const payload = {
                ...formData,
                capacity: parseInt(formData.capacity)
            };

            if (room) {
                await axios.put(`/rooms/${room.id}`, payload);
                showToast('Room updated successfully', 'success');
            } else {
                await axios.post('/rooms', payload);
                showToast('Room created successfully', 'success');
            }
            onSuccess();
            onClose();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to save room';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={room ? 'Edit Room' : 'Add New Room'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Room Code"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        placeholder="e.g. A-101"
                        required
                    />
                    <Input
                        label="Room Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Main Hall"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Type
                        </label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="w-full rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        >
                            <option value="classroom">Classroom</option>
                            <option value="lab">Laboratory</option>
                            <option value="seminar">Seminar Hall</option>
                            <option value="auditorium">Auditorium</option>
                        </select>
                    </div>
                    <Input
                        label="Capacity"
                        name="capacity"
                        type="number"
                        min="1"
                        value={formData.capacity}
                        onChange={handleChange}
                        required
                    />
                </div>

                <Input
                    label="Location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. First Floor, Block A"
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
                        {room ? 'Update Room' : 'Create Room'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default RoomForm;
