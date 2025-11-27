/**
 * DTO (Data Transfer Object) sanitizers
 * Remove sensitive fields before sending to client
 */

/**
 * Sanitize user object - remove password_hash
 * @param {object} user - User object from database
 * @returns {object} - Sanitized user
 */
export function sanitizeUser(user) {
    if (!user) return null;

    const { password_hash, ...sanitized } = user;
    return sanitized;
}

/**
 * Sanitize array of users
 * @param {array} users - Array of user objects
 * @returns {array} - Sanitized users
 */
export function sanitizeUsers(users) {
    if (!Array.isArray(users)) return [];
    return users.map(sanitizeUser);
}

/**
 * Sanitize schedule object - add computed fields
 * @param {object} schedule - Schedule object from database
 * @returns {object} - Enhanced schedule
 */
export function sanitizeSchedule(schedule) {
    if (!schedule) return null;

    return {
        ...schedule,
        // Convert MySQL DATETIME to ISO string if needed
        date: schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : null
    };
}

/**
 * Sanitize array of schedules
 */
export function sanitizeSchedules(schedules) {
    if (!Array.isArray(schedules)) return [];
    return schedules.map(sanitizeSchedule);
}

/**
 * Generic field remover
 * @param {object} obj - Object to sanitize
 * @param {array} fieldsToRemove - Fields to exclude
 * @returns {object} - Sanitized object
 */
export function removeFields(obj, fieldsToRemove = []) {
    if (!obj) return null;

    const sanitized = { ...obj };
    fieldsToRemove.forEach(field => delete sanitized[field]);

    return sanitized;
}

export default {
    sanitizeUser,
    sanitizeUsers,
    sanitizeSchedule,
    sanitizeSchedules,
    removeFields
};
