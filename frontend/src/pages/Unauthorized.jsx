import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Home, ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-50 px-4">
            <div className="text-center max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="bg-error/10 p-6 rounded-full">
                        <ShieldAlert className="text-error" size={64} />
                    </div>
                </div>

                <h1 className="text-4xl font-bold text-secondary-900 mb-4">Access Denied</h1>
                <p className="text-secondary-600 mb-8">
                    You don't have permission to access this page. Please contact your administrator if you believe this is an error.
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

export default Unauthorized;
