import axios from 'axios';
import { API_BASE_URL } from './constants';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - attach JWT token
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response) {
            const { status } = error.response;

            // 401 Unauthorized - token expired or invalid
            if (status === 401 && !originalRequest._retry) {
                if (isRefreshing) {
                    return new Promise(function (resolve, reject) {
                        failedQueue.push({ resolve, reject });
                    }).then(token => {
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                        originalRequest._retry = true;
                        return axiosInstance(originalRequest);
                    }).catch(err => {
                        return Promise.reject(err);
                    });
                }

                originalRequest._retry = true;
                isRefreshing = true;

                const refreshToken = localStorage.getItem('refreshToken');

                if (!refreshToken) {
                    // No refresh token, logout
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    return Promise.reject(error);
                }

                try {
                    // Use a new axios instance for refresh to avoid interceptor loop
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken
                    });

                    const { accessToken } = response.data.data;

                    localStorage.setItem('token', accessToken);
                    axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
                    originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;

                    processQueue(null, accessToken);
                    isRefreshing = false;

                    return axiosInstance(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    isRefreshing = false;

                    // Refresh failed, logout
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    window.location.href = '/login';

                    if (window.showToast) {
                        window.showToast('Session expired. Please login again.', 'error');
                    }

                    return Promise.reject(refreshError);
                }
            }

            // 403 Forbidden - access denied
            if (status === 403) {
                if (window.showToast) {
                    window.showToast('Access denied. You do not have permission.', 'error');
                }
            }
        } else if (error.request) {
            // Network error
            if (window.showToast) {
                window.showToast('Network error. Please check your connection.', 'error');
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
