const Skeleton = ({ className = '', ...props }) => {
    return (
        <div
            className={`animate-pulse bg-secondary-200 rounded ${className}`}
            {...props}
        />
    );
};

export default Skeleton;
