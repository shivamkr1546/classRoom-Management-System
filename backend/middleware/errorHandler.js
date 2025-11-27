import logger from '../utils/logger.js';

/**
 * Global error handling middleware
 * Catches all errors and formats them consistently
 */
export function errorHandler(err, req, res, next) {
    // Log error
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });

    // Default error response
    let status = err.status || 500;
    let response = {
        error: err.name || 'InternalServerError',
        message: err.message || 'An unexpected error occurred'
    };

    // Handle specific error types
    if (err.name === 'ValidationError') {
        status = 400;
        response.details = err.details;
    } else if (err.name === 'UnauthorizedError' || err.message.includes('token')) {
        status = 401;
        response.error = 'Unauthorized';
        response.message = 'Invalid or expired token';
    } else if (err.code === 'ER_DUP_ENTRY') {
        status = 409;
        response.error = 'DuplicateEntry';
        response.message = 'Resource already exists';
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        status = 400;
        response.error = 'InvalidReference';
        response.message = 'Referenced resource does not exist';
    }

    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production' && status === 500) {
        response.message = 'Internal server error';
        delete response.stack;
    } else if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
    }

    res.status(status).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'NotFound',
        message: `Route ${req.method} ${req.url} not found`
    });
}
