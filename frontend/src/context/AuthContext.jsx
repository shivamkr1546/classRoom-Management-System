import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from '../utils/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [refreshToken, setRefreshToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check auth on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const storedToken = localStorage.getItem('token');
            const storedRefreshToken = localStorage.getItem('refreshToken');

            if (!storedToken) {
                setLoading(false);
                return;
            }

            // Decode token to check expiration
            const decoded = jwtDecode(storedToken);

            // Check if token is expired
            if (decoded.exp * 1000 < Date.now()) {
                // Try to refresh if we have a refresh token
                if (storedRefreshToken) {
                    const refreshed = await refreshAccessToken(storedRefreshToken);
                    if (!refreshed) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                        localStorage.removeItem('user');
                        setLoading(false);
                        return;
                    }
                    // Token was refreshed successfully
                    // The new access token is already set in localStorage and state by refreshAccessToken
                    // Set the refresh token in state so logout() and other operations can use it
                    setRefreshToken(storedRefreshToken);
                } else {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setLoading(false);
                    return;
                }
            } else {
                // Token is still valid, set both tokens in state
                setToken(storedToken);
                setRefreshToken(storedRefreshToken);
            }

            // Fetch full user profile (will use the current valid token)
            const response = await axios.get('/auth/me');
            setUser(response.data.data);

        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        } finally {
            setLoading(false);
        }
    };

    const refreshAccessToken = async (refreshTkn) => {
        try {
            const response = await axios.post('/auth/refresh', { refreshToken: refreshTkn });
            const { accessToken } = response.data.data;

            localStorage.setItem('token', accessToken);
            setToken(accessToken);

            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    };

    const login = async (email, password) => {
        try {
            const response = await axios.post('/auth/login', { email, password });
            const { accessToken, refreshToken: newRefreshToken, user: userData } = response.data.data;

            localStorage.setItem('token', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            localStorage.setItem('user', JSON.stringify(userData));

            setToken(accessToken);
            setRefreshToken(newRefreshToken);
            setUser(userData);

            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            return { success: false, error: message };
        }
    };

    const logout = async () => {
        try {
            if (refreshToken) {
                await axios.post('/auth/logout', { refreshToken });
            }
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setToken(null);
            setRefreshToken(null);
            setUser(null);
        }
    };

    const value = {
        user,
        token,
        refreshToken,
        loading,
        login,
        logout,
        refreshAccessToken,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
