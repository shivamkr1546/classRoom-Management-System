import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Home } from 'lucide-react';

const NotFound = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-50 px-4">
            <div className="text-center">
                <h1 className="text-9xl font-bold text-primary-600 mb-4">404</h1>
                <h2 className="text-3xl font-semibold text-secondary-900 mb-2">Page Not Found</h2>
                <p className="text-secondary-600 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>

                <Link to="/dashboard">
                    <Button icon={Home}>
                        Go to Dashboard
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default NotFound;
