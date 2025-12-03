const Input = ({
    label,
    error,
    icon: Icon = null,
    type = 'text',
    className = '',
    ...props
}) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                    {label}
                </label>
            )}

            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon className="h-5 w-5 text-secondary-400" />
                    </div>
                )}

                <input
                    type={type}
                    className={`
            block w-full rounded-lg border
            ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2
            ${error ? 'border-error focus:ring-error focus:border-error' : 'border-secondary-300 focus:ring-primary-500 focus:border-primary-500'}
            focus:outline-none focus:ring-2
            disabled:bg-secondary-100 disabled:cursor-not-allowed
            ${className}
          `}
                    {...props}
                />
            </div>

            {error && (
                <p className="mt-1 text-sm text-error">{error}</p>
            )}
        </div>
    );
};

export default Input;
