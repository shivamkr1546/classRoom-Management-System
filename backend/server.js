import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { testConnection } from './config/database.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import roomRoutes from './routes/rooms.routes.js';
import courseRoutes from './routes/courses.routes.js';
import studentRoutes from './routes/students.routes.js';
import scheduleRoutes from './routes/schedules.routes.js';
// Phase 4: Attendance & Analytics
import enrollmentRoutes from './routes/enrollments.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// SECURITY: Rate Limiting & Brute-Force Protection
// ========================================

// Global rate limiter (prevents abusive requests across all endpoints)
const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300,            // max 300 requests per window per IP
    message: { error: 'TooManyRequests', message: 'Too many requests, please slow down' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(globalLimiter);

// Login-specific brute-force protection
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                   // allow 5 attempts per window per IP
    skip: (req) => {
        // Skip rate limiting for localhost (development and testing)
        const ip = req.ip || '';
        return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    },
    message: { error: 'TooManyAttempts', message: 'Too many login attempts, try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Only count failed login attempts
});

// Progressive slowdown after repeated login attempts
const loginSpeedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 3,            // start slowing down after 3rd request
    delayMs: (req) => {
        // No slowdown for localhost (development and testing)
        const ip = req.ip || '';
        if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
            return 0;
        }
        return 500; // add 500ms per request for external IPs
    }
});

// Bulk operation rate limiter (prevent flooding with bulk imports)
const bulkLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,             // max 10 bulk requests per minute
    message: { error: 'TooManyBulkRequests', message: 'Too many bulk requests, please slow down' },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to sensitive endpoints
app.use('/api/auth/login', loginSpeedLimiter, loginLimiter);
app.use('/api/enrollments/bulk', bulkLimiter);
app.use('/api/schedules/bulk', bulkLimiter);
app.use('/api/attendance/bulk', bulkLimiter);
app.use('/api/students/bulk', bulkLimiter);

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next()
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/schedules', scheduleRoutes);
// Phase 4 Routes
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/analytics', analyticsRoutes);

// Test routes (for development only)
if (process.env.NODE_ENV !== 'production') {
    const testRoutes = (await import('./routes/test.routes.js')).default;
    app.use('/api/test', testRoutes);
    logger.info('🧪 Test routes enabled at /api/test');
}

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
    try {
        // Test database connection
        const dbConnected = await testConnection();

        if (!dbConnected) {
            logger.error('Failed to connect to database. Server not started.');
            process.exit(1);
        }

        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app;
