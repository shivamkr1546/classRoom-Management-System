/**
 * Centralized API response helpers
 * Ensures consistent response format across all endpoints
 */

/**
 * Send a successful response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {any} data - Response data
 * @param {string} message - Optional success message
 */
export function sendSuccess(res, statusCode = 200, data = null, message = null) {
    const response = {};

    if (message) {
        response.message = message;
    }

    if (data !== null) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
}

/**
 * Send a paginated response
 * @param {object} res - Express response object
 * @param {array} data - Array of items
 * @param {object} pagination - Pagination metadata
 */
export function sendPaginatedResponse(res, data, pagination) {
    return res.status(200).json({
        data,
        pagination
    });
}

/**
 * Send an error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Error name/type
 * @param {string} message - Error message
 * @param {any} details - Optional error details
 */
export function sendError(res, statusCode, error, message, details = null) {
    const response = {
        error,
        message
    };

    if (details) {
        response.details = details;
    }

    return res.status(statusCode).json(response);
}

export default {
    sendSuccess,
    sendPaginatedResponse,
    sendError
};
