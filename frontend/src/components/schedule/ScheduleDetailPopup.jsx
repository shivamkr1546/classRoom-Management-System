import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Pencil, Trash2, Calendar, Clock, MapPin, User, BookOpen } from 'lucide-react';
import { formatTimeRange, formatDateDisplay } from '../../utils/scheduleUtils';
import axios from '../../utils/axios';
import { useToast } from '../../context/ToastContext';

/**
 * ScheduleDetailPopup Component
 * Modal displaying full schedule details with edit/delete actions
 */
const ScheduleDetailPopup = ({ isOpen, onClose, scheduleId, onEdit, onDelete, canModify }) => {
    const { showToast } = useToast();
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && scheduleId) {
            fetchScheduleDetails();
        }
    }, [isOpen, scheduleId]);

    const fetchScheduleDetails = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/schedules/${scheduleId}`);
            setSchedule(response.data.data);
        } catch (error) {
            showToast('Failed to fetch schedule details', 'error');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        onEdit(schedule);
        onClose();
    };

    const handleDelete = () => {
        onDelete(schedule);
        onClose();
    };

    if (!isOpen || !schedule) return null;

    const isCancelled = schedule.status === 'cancelled';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Schedule Details"
            size="md"
            footer={
                canModify && !isCancelled ? (
                    <div className="flex justify-end space-x-3">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                        <Button variant="outline" icon={Pencil} onClick={handleEdit}>
                            Edit
                        </Button>
                        <Button
                            variant="outline"
                            icon={Trash2}
                            onClick={handleDelete}
                            className="text-red-600 hover:bg-red-50 border-red-300"
                        >
                            Cancel Schedule
                        </Button>
                    </div>
                ) : (
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                )
            }
        >
            {loading ? (
                <div className="py-8 text-center text-secondary-500">Loading...</div>
            ) : (
                <div className="space-y-4">
                    {/* Status Badge */}
                    {isCancelled && (
                        <div className="bg-red-100 text-red-800 px-3 py-2 rounded-md font-semibold">
                            ⚠️ This schedule has been cancelled
                        </div>
                    )}

                    {/* Course Information */}
                    <div className="bg-secondary-50 p-4 rounded-lg space-y-3">
                        <div className="flex items-start space-x-3">
                            <BookOpen className="text-primary-600 mt-1" size={20} />
                            <div>
                                <div className="text-sm text-secondary-500">Course</div>
                                <div className="font-semibold text-secondary-900">
                                    {schedule.course_code} - {schedule.course_name}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <User className="text-primary-600 mt-1" size={20} />
                            <div>
                                <div className="text-sm text-secondary-500">Instructor</div>
                                <div className="font-semibold text-secondary-900">
                                    {schedule.instructor_name}
                                </div>
                                <div className="text-sm text-secondary-600">
                                    {schedule.instructor_email}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <MapPin className="text-primary-600 mt-1" size={20} />
                            <div>
                                <div className="text-sm text-secondary-500">Room</div>
                                <div className="font-semibold text-secondary-900">
                                    {schedule.room_code} - {schedule.room_name}
                                </div>
                                {schedule.room_location && (
                                    <div className="text-sm text-secondary-600">
                                        {schedule.room_location}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Calendar className="text-primary-600 mt-1" size={20} />
                            <div>
                                <div className="text-sm text-secondary-500">Date</div>
                                <div className="font-semibold text-secondary-900">
                                    {formatDateDisplay(schedule.date)}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Clock className="text-primary-600 mt-1" size={20} />
                            <div>
                                <div className="text-sm text-secondary-500">Time</div>
                                <div className="font-semibold text-secondary-900">
                                    {formatTimeRange(schedule.start_time, schedule.end_time)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Capacity Information */}
                    <div className="pt-3 border-t border-secondary-200">
                        <div className="text-sm text-secondary-600">
                            <span className="font-medium">Room Capacity:</span>{' '}
                            {schedule.room_capacity} seats
                        </div>
                        <div className="text-sm text-secondary-600">
                            <span className="font-medium">Course Required:</span>{' '}
                            {schedule.required_capacity} seats
                        </div>
                        {schedule.room_capacity < schedule.required_capacity && (
                            <div className="text-sm text-orange-600 font-medium mt-1">
                                ⚠️ Room capacity is below course requirement
                            </div>
                        )}
                    </div>

                    {/* Metadata */}
                    {schedule.created_by_name && (
                        <div className="pt-3 border-t border-secondary-200 text-xs text-secondary-500">
                            Created by {schedule.created_by_name}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};

ScheduleDetailPopup.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    scheduleId: PropTypes.number,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    canModify: PropTypes.bool.isRequired,
};

export default ScheduleDetailPopup;
