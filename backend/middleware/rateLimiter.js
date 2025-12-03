import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware
 * Prevents abuse and DOS attacks on analytics and export endpoints
 */

// General analytics rate limiter - 100 requests per minute
export const analyticsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 100, // 100 requests per window
    message: {
        error: 'TooManyRequests',
        message: 'Too many analytics requests, please try again later'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests: false
});

// Live rooms specific limiter - 120 requests per hour (45s interval = ~80/hr, buffer for manual)
export const liveRoomsLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 120, // 120 requests per hour
    message: {
        error: 'TooManyRequests',
        message: 'Too many live room requests. Auto-refresh interval is 45 seconds.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// CSV export limiter - prevent rapid exports that could stress the system
export const exportLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 5, // 5 exports per minute
    message: {
        error: 'TooManyRequests',
        message: 'Too many export requests. Please wait a moment before exporting again.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Schedule creation limiter - prevent bulk schedule spam
export const scheduleModifyLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 schedule modifications per minute
    message: {
        error: 'TooManyRequests',
        message: 'Too many schedule operations. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});
