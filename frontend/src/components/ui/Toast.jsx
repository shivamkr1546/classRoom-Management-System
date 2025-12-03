import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const Toast = ({ id, message, type, onClose }) => {
    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        warning: AlertTriangle,
        info: Info,
    };

    const colors = {
        success: 'bg-success text-white',
        error: 'bg-error text-white',
        warning: 'bg-warning text-white',
        info: 'bg-info text-white',
    };

    const Icon = icons[type] || Info;

    return (
        <div
            className={`flex items-center gap-3 ${colors[type]} px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md animate-slide-in`}
        >
            <Icon size={20} />
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button
                onClick={() => onClose(id)}
                className="hover:opacity-75 transition-opacity"
            >
                <X size={18} />
            </button>
        </div>
    );
};

const ToastContainer = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    id={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={removeToast}
                />
            ))}
        </div>
    );
};

export default ToastContainer;
