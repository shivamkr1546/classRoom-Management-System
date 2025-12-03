const Card = ({ children, className = '' }) => {
    return (
        <div className={`bg-white rounded-lg shadow-sm border border-secondary-200 ${className}`}>
            {children}
        </div>
    );
};

const CardHeader = ({ children, className = '' }) => {
    return (
        <div className={`px-6 py-4 border-b border-secondary-200 ${className}`}>
            {children}
        </div>
    );
};

const CardBody = ({ children, className = '' }) => {
    return (
        <div className={`px-6 py-4 ${className}`}>
            {children}
        </div>
    );
};

const CardFooter = ({ children, className = '' }) => {
    return (
        <div className={`px-6 py-4 border-t border-secondary-200 ${className}`}>
            {children}
        </div>
    );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
