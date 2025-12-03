/**
 * Schedule Utilities
 * Helper functions for schedule rendering, time formatting, and overlap detection
 */

// Fixed color palette (12 high-contrast Tailwind colors)
export const COURSE_COLORS = [
    { bg: 'bg-blue-500', text: 'text-white', hover: 'hover:bg-blue-600' },
    { bg: 'bg-green-500', text: 'text-white', hover: 'hover:bg-green-600' },
    { bg: 'bg-purple-500', text: 'text-white', hover: 'hover:bg-purple-600' },
    { bg: 'bg-pink-500', text: 'text-white', hover: 'hover:bg-pink-600' },
    { bg: 'bg-orange-500', text: 'text-white', hover: 'hover:bg-orange-600' },
    { bg: 'bg-teal-500', text: 'text-white', hover: 'hover:bg-teal-600' },
    { bg: 'bg-red-500', text: 'text-white', hover: 'hover:bg-red-600' },
    { bg: 'bg-indigo-500', text: 'text-white', hover: 'hover:bg-indigo-600' },
    { bg: 'bg-yellow-500', text: 'text-gray-900', hover: 'hover:bg-yellow-600' },
    { bg: 'bg-cyan-500', text: 'text-white', hover: 'hover:bg-cyan-600' },
    { bg: 'bg-rose-500', text: 'text-white', hover: 'hover:bg-rose-600' },
    { bg: 'bg-violet-500', text: 'text-white', hover: 'hover:bg-violet-600' },
];

/**
 * Get deterministic color for a course
 * @param {number} courseId - Course ID
 * @returns {object} Color object with bg, text, and hover classes
 */
export function getCourseColor(courseId) {
    const index = courseId % COURSE_COLORS.length;
    return COURSE_COLORS[index];
}

/**
 * Parse time string (HH:MM or HH:MM:SS) to hours and minutes
 * @param {string} timeString - Time in HH:MM or HH:MM:SS format
 * @returns {object} Object with hours and minutes
 */
export function parseTime(timeString) {
    if (!timeString) return { hours: 0, minutes: 0 };
    const parts = timeString.split(':');
    return {
        hours: parseInt(parts[0], 10),
        minutes: parseInt(parts[1], 10),
    };
}

/**
 * Convert 24-hour time to 12-hour format with AM/PM
 * @param {string} timeString - Time in HH:MM:SS format
 * @returns {string} Time in "h:MM AM/PM" format
 */
export function formatTime(timeString) {
    if (!timeString) return '';
    const { hours, minutes } = parseTime(timeString);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format time range for display
 * @param {string} startTime - Start time in HH:MM:SS format
 * @param {string} endTime - End time in HH:MM:SS format
 * @returns {string} Formatted time range
 */
export function formatTimeRange(startTime, endTime) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Calculate block height based on duration
 * @param {string} startTime - Start time in HH:MM:SS format
 * @param {string} endTime - End time in HH:MM:SS format
 * @returns {number} Height in pixels (60px per hour)
 */
export function calculateBlockHeight(startTime, endTime) {
    const start = parseTime(startTime);
    const end = parseTime(endTime);

    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;
    const durationMinutes = endMinutes - startMinutes;

    // 60px per hour = 1px per minute
    return durationMinutes;
}

/**
 * Calculate block top position from grid start (8 AM)
 * @param {string} startTime - Start time in HH:MM:SS format
 * @returns {number} Top position in pixels from 8 AM
 */
export function calculateBlockTop(startTime) {
    const GRID_START_HOUR = 8; // 8 AM
    const { hours, minutes } = parseTime(startTime);

    const totalMinutes = hours * 60 + minutes;
    const gridStartMinutes = GRID_START_HOUR * 60;
    const offsetMinutes = totalMinutes - gridStartMinutes;

    // 1px per minute
    return offsetMinutes;
}

/**
 * Validate time range
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 * @returns {boolean} True if valid
 */
export function isTimeValid(startTime, endTime) {
    if (!startTime || !endTime) return false;

    const start = parseTime(startTime);
    const end = parseTime(endTime);

    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;

    return endMinutes > startMinutes;
}

/**
 * Get Monday-Friday dates for a specific week offset from current week
 * @param {number} weekOffset - Week offset (0 = current week, 1 = next week, -1 = last week)
 * @returns {Array} Array of 5 date objects (Mon-Fri)
 */
export function getWeekDates(weekOffset = 0) {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate offset to Monday of current week
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);

    // Generate Mon-Fri
    const weekDates = [];
    for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        weekDates.push(date);
    }

    return weekDates;
}

/**
 * Format date for API submission
 * @param {Date} date - Date object
 * @returns {string} Date in YYYY-MM-DD format
 */
export function formatDateForAPI(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date for display
 * @param {Date|string} date - Date object or string
 * @returns {string} Formatted date (e.g., "Mon, Jan 15")
 */
export function formatDateDisplay(date) {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return dateObj.toLocaleDateString('en-US', options);
}

/**
 * Convert time string to HH:MM format for input fields
 * @param {string} timeString - Time in HH:MM:SS format
 * @returns {string} Time in HH:MM format
 */
export function formatTimeForInput(timeString) {
    if (!timeString) return '';
    return timeString.substring(0, 5); // Extract HH:MM from HH:MM:SS
}

/**
 * Convert HH:MM input to HH:MM:SS for API
 * @param {string} timeString - Time in HH:MM format
 * @returns {string} Time in HH:MM:SS format
 */
export function formatTimeForAPI(timeString) {
    if (!timeString) return '';
    return `${timeString}:00`;
}

/**
 * Check if two time ranges overlap
 * @param {string} start1 - Start time 1
 * @param {string} end1 - End time 1
 * @param {string} start2 - Start time 2
 * @param {string} end2 - End time 2
 * @returns {boolean} True if overlapping
 */
export function timeRangesOverlap(start1, end1, start2, end2) {
    const s1 = parseTime(start1);
    const e1 = parseTime(end1);
    const s2 = parseTime(start2);
    const e2 = parseTime(end2);

    const s1Minutes = s1.hours * 60 + s1.minutes;
    const e1Minutes = e1.hours * 60 + e1.minutes;
    const s2Minutes = s2.hours * 60 + s2.minutes;
    const e2Minutes = e2.hours * 60 + e2.minutes;

    return s1Minutes < e2Minutes && e1Minutes > s2Minutes;
}

/**
 * Detect overlapping schedules for a specific date
 * @param {Array} schedules - Array of schedule objects for a specific day
 * @returns {Map} Map of schedule ID to array of overlapping schedule IDs
 */
export function detectOverlaps(schedules) {
    const overlapMap = new Map();

    for (let i = 0; i < schedules.length; i++) {
        const overlaps = [];
        for (let j = 0; j < schedules.length; j++) {
            if (i !== j && timeRangesOverlap(
                schedules[i].start_time,
                schedules[i].end_time,
                schedules[j].start_time,
                schedules[j].end_time
            )) {
                overlaps.push(schedules[j].id);
            }
        }
        if (overlaps.length > 0) {
            overlapMap.set(schedules[i].id, overlaps);
        }
    }

    return overlapMap;
}

/**
 * Calculate position for overlapping blocks
 * @param {object} schedule - Schedule object
 * @param {number} overlapIndex - Index of this schedule in overlap group
 * @param {number} totalOverlaps - Total number of overlapping schedules in group
 * @returns {object} Object with left offset (%) and width (%)
 */
export function calculateBlockPosition(schedule, overlapIndex, totalOverlaps) {
    if (totalOverlaps <= 1) {
        return { left: 0, width: 100 };
    }

    // Each block gets equal width, with slight offset
    const width = 75; // 75% width for overlapping blocks
    const offsetPerBlock = 25 / (totalOverlaps - 1);
    const left = overlapIndex * offsetPerBlock;

    return { left, width };
}

/**
 * Get time slots for the grid (8 AM to 8 PM)
 * @returns {Array} Array of time slot strings
 */
export function getTimeSlots() {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00:00`;
        slots.push({
            time,
            display: formatTime(time),
        });
    }
    return slots;
}

/**
 * Convert Date to date key (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} Date key
 */
export function getDateKey(date) {
    return formatDateForAPI(date);
}

/**
 * Check if date is today
 * @param {Date} date - Date to check
 * @returns {boolean} True if today
 */
export function isToday(date) {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}
