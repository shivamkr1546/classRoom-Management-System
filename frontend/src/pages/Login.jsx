import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await login(formData.email, formData.password);

            if (result.success) {
                showToast('Login successful!', 'success');
                navigate('/dashboard');
            } else {
                showToast(result.error, 'error');
            }
        } catch (error) {
            showToast('An unexpected error occurred', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 animate-slide-in">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-secondary-900 mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-secondary-600">
                        Sign in to your Classroom Management account
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        icon={Mail}
                        placeholder="your.email@example.com"
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        icon={Lock}
                        placeholder="Enter your password"
                        required
                    />

                    <Button
                        type="submit"
                        className="w-full"
                        loading={loading}
                    >
                        Sign In
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-secondary-600">
                    <p>Demo accounts:</p>
                    <p className="mt-1">Admin: admin@classroom.com / admin123</p>
                    <p>Coordinator: coordinator@classroom.com / coord123</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
