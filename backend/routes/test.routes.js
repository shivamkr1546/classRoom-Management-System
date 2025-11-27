import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Test route to verify JWT authentication
 * GET /test/auth
 */
router.get('/auth', authenticate, (req, res) => {
    res.json({
        message: 'Authentication successful!',
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

/**
 * Test route to verify error handling
 * GET /test/error
 */
router.get('/error', (req, res, next) => {
    // Trigger an error to test error handler
    const error = new Error('This is a test error');
    error.status = 500;
    next(error);
});

/**
 * Test validation error
 * GET /test/validation-error
 */
router.get('/validation-error', (req, res) => {
    return res.status(400).json({
        error: 'ValidationError',
        message: 'Test validation error',
        details: [
            { field: 'email', message: 'Email is required' },
            { field: 'password', message: 'Password must be at least 6 characters' }
        ]
    });
});

/**
 * Test database connection
 * GET /test/db
 */
router.get('/db', async (req, res, next) => {
    try {
        const { query } = await import('../utils/db.js');
        const result = await query('SELECT 1 + 1 AS solution');
        res.json({
            message: 'Database connection successful',
            result: result[0]
        });
    } catch (error) {
        next(error);
    }
});

export default router;
