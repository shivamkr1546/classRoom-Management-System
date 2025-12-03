import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

const DeleteConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Delete',
    itemName = 'item',
    loading = false,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <div className="flex justify-end space-x-3">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        loading={loading}
                    >
                        Delete
                    </Button>
                </div>
            }
        >
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                    <p className="text-sm text-secondary-600">
                        Are you sure you want to delete <span className="font-semibold text-secondary-900">{itemName}</span>?
                        This action cannot be undone.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default DeleteConfirmModal;
