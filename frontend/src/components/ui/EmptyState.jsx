import Button from './Button';

const EmptyState = ({
    icon: Icon,
    title,
    message,
    actionLabel,
    onAction,
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            {Icon && (
                <div className="bg-secondary-100 rounded-full p-4 mb-4">
                    <Icon className="h-8 w-8 text-secondary-500" />
                </div>
            )}
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
                {title}
            </h3>
            <p className="text-secondary-500 max-w-sm mb-6">
                {message}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};

export default EmptyState;
