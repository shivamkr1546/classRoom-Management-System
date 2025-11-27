/**
 * Date and time formatting utilities
 * Ensures consistent ISO formatting for schedules
 */

/**
 * Format date to YYYY-MM-DD
 * @param {Date|string} date - Date object or string
 * @returns {string} - Formatted date
 */
export function formatDate(date) {
    if (!date) return null;

    const d = new Date(date);

    if (isNaN(d.getTime())) {
        return null; // Invalid date
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Format time to HH:mm:ss
 * @param {string} time - Time string (can be HH:mm or HH:mm:ss)
 * @returns {string} - Formatted time
 */
export function formatTime(time) {
    if (!time) return null;

    // If already in HH:mm:ss format
    if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
        return time;
    }

    // If in HH:mm format, add :00
    if (/^\d{2}:\d{2}$/.test(time)) {
        return `${time}:00`;
    }

    return null; // Invalid format
}

/**
 * Parse time string to minutes since midnight
 * Useful for time comparisons
 * @param {string} time - Time in HH:mm:ss or HH:mm format
 * @returns {number} - Minutes since midnight
 */
export function timeToMinutes(time) {
    if (!time) return 0;

    const parts = time.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;

    return hours * 60 + minutes;
}

/**
 * Check if end time is after start time
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 * @returns {boolean} - True if end > start
 */
export function isValidTimeRange(startTime, endTime) {
    return timeToMinutes(endTime) > timeToMinutes(startTime);
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} - Today's date
 */
export function getCurrentDate() {
    return formatDate(new Date());
}

/**
 * Get current time in HH:mm:ss format
 * @returns {string} - Current time
 */
export function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Add days to a date
 * @param {Date|string} date - Starting date
 * @param {number} days - Days to add
 * @returns {string} - New date in YYYY-MM-DD
 */
export function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return formatDate(d);
}

/**
 * Get week start date (Monday) for a given date
 * @param {Date|string} date - Any date
 * @returns {string} - Monday of that week
 */
export function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    return formatDate(d);
}

export default {
    formatDate,
    formatTime,
    timeToMinutes,
    isValidTimeRange,
    getCurrentDate,
    getCurrentTime,
    addDays,
    getWeekStart
};
