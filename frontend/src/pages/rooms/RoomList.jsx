import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Building } from 'lucide-react';
import axios from '../../utils/axios';
import { useToast } from '../../context/ToastContext';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import FilterDropdown from '../../components/ui/FilterDropdown';
import DeleteConfirmModal from '../../components/ui/DeleteConfirmModal';
import EmptyState from '../../components/ui/EmptyState';
import RoomForm from './RoomForm';

const RoomList = () => {
    const { showToast } = useToast();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [type, setType] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [roomToDelete, setRoomToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchRooms = useCallback(async (signal) => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 10,
                search,
                type: type === 'all' ? '' : type
            };
            const response = await axios.get('/rooms', { params, signal });
            setRooms(response.data.data || []);
            setTotalPages(response.data.pagination?.totalPages || 1);
            setTotalItems(response.data.pagination?.total || 0);
        } catch (error) {
            if (!axios.isCancel(error)) {
                showToast('Failed to fetch rooms', 'error');
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [page, search, type, showToast]);

    useEffect(() => {
        const controller = new AbortController();
        fetchRooms(controller.signal);
        return () => controller.abort();
    }, [fetchRooms]);

    const handleCreate = () => {
        setEditingRoom(null);
        setIsFormOpen(true);
    };

    const handleEdit = (room) => {
        setEditingRoom(room);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (room) => {
        setRoomToDelete(room);
        setIsDeleteOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!roomToDelete) return;
        setDeleteLoading(true);
        try {
            await axios.delete(`/rooms/${roomToDelete.id}`);
            showToast('Room deleted successfully', 'success');
            fetchRooms();
            setIsDeleteOpen(false);
        } catch (error) {
            showToast('Failed to delete room', 'error');
        } finally {
            setDeleteLoading(false);
            setRoomToDelete(null);
        }
    };

    const columns = [
        { label: 'Code', key: 'code' },
        { label: 'Name', key: 'name' },
        {
            label: 'Type',
            key: 'type',
            render: (value) => <span className="capitalize">{value}</span>
        },
        { label: 'Capacity', key: 'capacity' },
        { label: 'Location', key: 'location' }
    ];

    const roomTypes = [
        { label: 'All Types', value: 'all' },
        { label: 'Classroom', value: 'classroom' },
        { label: 'Laboratory', value: 'lab' },
        { label: 'Seminar Hall', value: 'seminar' },
        { label: 'Auditorium', value: 'auditorium' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-secondary-900">Rooms</h1>
                <Button onClick={handleCreate} icon={Plus}>
                    Add Room
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-secondary-200">
                <div className="flex-1">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Search rooms..."
                    />
                </div>
                <div className="w-full sm:w-48">
                    <FilterDropdown
                        options={roomTypes}
                        value={type}
                        onChange={setType}
                    />
                </div>
            </div>

            {loading ? (
                <Table loading={true} columns={columns} />
            ) : rooms.length === 0 ? (
                <EmptyState
                    icon={Building}
                    title="No rooms found"
                    message={search || type ? "Try adjusting your filters" : "Get started by creating your first room"}
                    actionLabel={search || type ? "Clear Filters" : "Create Room"}
                    onAction={search || type ? () => { setSearch(''); setType(''); } : handleCreate}
                />
            ) : (
                <>
                    <Table
                        columns={columns}
                        data={rooms}
                        actions={(room) => (
                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Pencil}
                                    onClick={(e) => { e.stopPropagation(); handleEdit(room); }}
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Trash2}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(room); }}
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

            <RoomForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                room={editingRoom}
                onSuccess={fetchRooms}
            />

            <DeleteConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Room"
                itemName={roomToDelete?.name}
                loading={deleteLoading}
            />
        </div>
    );
};

export default RoomList;
