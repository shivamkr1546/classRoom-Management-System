import { query } from './db.js';

/**
 * Convert various time representations to seconds since midnight
 * Supports TIME strings (HH:MM or HH:MM:SS), Date objects, buffers, and numbers
 * @param {string|Date|number|Buffer} value
 * @returns {number|null}
 */
function toSeconds(value) {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
    }

    if (value instanceof Date) {
        return value.getUTCHours() * 3600 + value.getUTCMinutes() * 60 + value.getUTCSeconds();
    }

    if (Buffer.isBuffer(value)) {
        value = value.toString();
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();

        // HH:MM or HH:MM:SS
        const timeMatch = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
        if (timeMatch) {
            const hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
            return hours * 3600 + minutes * 60 + seconds;
        }

        const numericValue = Number(trimmed);
        if (!Number.isNaN(numericValue)) {
            return numericValue;
        }
    }

    return null;
}

/**
 * Normalize incoming date values (Date objects or strings) to YYYY-MM-DD
 * @param {string|Date} value
 * @returns {string|undefined}
 */
export function normalizeDateInput(value) {
    if (!value) {
        return value;
    }

    if (value instanceof Date) {
        return value.toISOString().split('T')[0];
    }

    if (typeof value === 'string') {
        return value.split('T')[0];
    }

    return value;
}

/**
 * Scheduling utilities for conflict detection and validation
 * Phase 3: Scheduling Engine
 */

/**
 * Check if two time ranges overlap
 * CRITICAL: Uses strict inequality - touching boundaries do NOT conflict
 * Example: 09:00-10:00 and 10:00-11:00 → No conflict
 * 
 * @param {string} start1 - First time range start (HH:MM:SS)
 * @param {string} end1 - First time range end (HH:MM:SS)
 * @param {string} start2 - Second time range start (HH:MM:SS)
 * @param {string} end2 - Second time range end (HH:MM:SS)
 * @returns {boolean} - True if ranges overlap, false if they don't
 */
export function checkTimeOverlap(start1, end1, start2, end2) {
    const range1Start = toSeconds(start1);
    const range1End = toSeconds(end1);
    const range2Start = toSeconds(start2);
    const range2End = toSeconds(end2);

    if ([range1Start, range1End, range2Start, range2End].some(value => value === null)) {
        return false;
    }

    // Using strict inequality: touching boundaries are allowed
    return range1End > range2Start && range1Start < range2End;
}

/**
 * Check for room scheduling conflicts
 * Queries schedules table for same room on same date with overlapping time
 * 
 * @param {number} roomId - Room ID to check
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} startTime - Start time in HH:MM:SS format
 * @param {string} endTime - End time in HH:MM:SS format
 * @param {number|null} excludeScheduleId - Schedule ID to exclude (for updates)
 * @returns {Promise<{hasConflict: boolean, conflictingSchedules: Array}>}
 */
export async function checkRoomConflict(roomId, date, startTime, endTime, excludeScheduleId = null) {
    try {
        // Query all confirmed schedules for the same room on the same date
        let sql = `
            SELECT s.*, r.code as room_code, r.name as room_name,
                   c.code as course_code, c.name as course_name,
                   u.name as instructor_name
            FROM schedules s
            JOIN rooms r ON s.room_id = r.id
            JOIN courses c ON s.course_id = c.id
            JOIN users u ON s.instructor_id = u.id
            WHERE s.room_id = ?
              AND s.date = ?
              AND s.status = 'confirmed'
        `;
        const params = [roomId, date];

        // Exclude the current schedule being updated
        if (excludeScheduleId) {
            sql += ' AND s.id != ?';
            params.push(excludeScheduleId);
        }

        const existingSchedules = await query(sql, params);

        // Check for time overlap with each existing schedule
        const conflictingSchedules = existingSchedules.filter(schedule => {
            return checkTimeOverlap(startTime, endTime, schedule.start_time, schedule.end_time);
        });

        return {
            hasConflict: conflictingSchedules.length > 0,
            conflictingSchedules
        };
    } catch (error) {
        throw new Error(`Failed to check room conflict: ${error.message}`);
    }
}

/**
 * Check for instructor scheduling conflicts
 * Queries schedules table for same instructor on same date with overlapping time
 * 
 * @param {number} instructorId - Instructor ID to check
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} startTime - Start time in HH:MM:SS format
 * @param {string} endTime - End time in HH:MM:SS format
 * @param {number|null} excludeScheduleId - Schedule ID to exclude (for updates)
 * @returns {Promise<{hasConflict: boolean, conflictingSchedules: Array}>}
 */
export async function checkInstructorConflict(instructorId, date, startTime, endTime, excludeScheduleId = null) {
    try {
        // Query all confirmed schedules for the same instructor on the same date
        let sql = `
            SELECT s.*, r.code as room_code, r.name as room_name,
                   c.code as course_code, c.name as course_name,
                   u.name as instructor_name
            FROM schedules s
            JOIN rooms r ON s.room_id = r.id
            JOIN courses c ON s.course_id = c.id
            JOIN users u ON s.instructor_id = u.id
            WHERE s.instructor_id = ?
              AND s.date = ?
              AND s.status = 'confirmed'
        `;
        const params = [instructorId, date];

        // Exclude the current schedule being updated
        if (excludeScheduleId) {
            sql += ' AND s.id != ?';
            params.push(excludeScheduleId);
        }

        const existingSchedules = await query(sql, params);

        // Check for time overlap with each existing schedule
        const conflictingSchedules = existingSchedules.filter(schedule => {
            return checkTimeOverlap(startTime, endTime, schedule.start_time, schedule.end_time);
        });

        return {
            hasConflict: conflictingSchedules.length > 0,
            conflictingSchedules
        };
    } catch (error) {
        throw new Error(`Failed to check instructor conflict: ${error.message}`);
    }
}

/**
 * Validate room capacity against course requirements
 * 
 * @param {number} roomId - Room ID to check
 * @param {number} courseId - Course ID to check
 * @returns {Promise<{isValid: boolean, roomCapacity: number, requiredCapacity: number, message: string}>}
 */
export async function validateRoomCapacity(roomId, courseId) {
    try {
        // Get room capacity
        const roomResult = await query(
            'SELECT capacity FROM rooms WHERE id = ?',
            [roomId]
        );

        if (roomResult.length === 0) {
            return {
                isValid: false,
                roomCapacity: 0,
                requiredCapacity: 0,
                message: 'Room not found'
            };
        }

        // Get course required capacity
        const courseResult = await query(
            'SELECT required_capacity FROM courses WHERE id = ?',
            [courseId]
        );

        if (courseResult.length === 0) {
            return {
                isValid: false,
                roomCapacity: roomResult[0].capacity,
                requiredCapacity: 0,
                message: 'Course not found'
            };
        }

        const roomCapacity = roomResult[0].capacity;
        const requiredCapacity = courseResult[0].required_capacity || 0;

        const isValid = roomCapacity >= requiredCapacity;

        return {
            isValid,
            roomCapacity,
            requiredCapacity,
            message: isValid
                ? 'Room capacity is sufficient'
                : `Room capacity (${roomCapacity}) is less than required capacity (${requiredCapacity})`
        };
    } catch (error) {
        throw new Error(`Failed to validate room capacity: ${error.message}`);
    }
}

/**
 * Validate instructor is assigned to the course
 * 
 * @param {number} instructorId - Instructor ID to check
 * @param {number} courseId - Course ID to check
 * @returns {Promise<{isAssigned: boolean, message: string}>}
 */
export async function validateInstructorAssignment(instructorId, courseId) {
    try {
        // Check if instructor exists and has instructor role
        const instructorResult = await query(
            'SELECT id, name, role FROM users WHERE id = ? AND role = ?',
            [instructorId, 'instructor']
        );

        if (instructorResult.length === 0) {
            return {
                isAssigned: false,
                message: 'Instructor not found or user is not an instructor'
            };
        }

        // Check course_instructors junction table
        const assignmentResult = await query(
            'SELECT id FROM course_instructors WHERE course_id = ? AND instructor_id = ?',
            [courseId, instructorId]
        );

        const isAssigned = assignmentResult.length > 0;

        return {
            isAssigned,
            message: isAssigned
                ? 'Instructor is assigned to the course'
                : `Instructor ${instructorResult[0].name} is not assigned to this course`
        };
    } catch (error) {
        throw new Error(`Failed to validate instructor assignment: ${error.message}`);
    }
}

/**
 * Master validation function for schedule creation/update
 * Orchestrates all validation checks
 * 
 * @param {Object} scheduleData - Schedule data to validate
 * @param {number} scheduleData.room_id - Room ID
 * @param {number} scheduleData.course_id - Course ID
 * @param {number} scheduleData.instructor_id - Instructor ID
 * @param {string} scheduleData.date - Date in YYYY-MM-DD format
 * @param {string} scheduleData.start_time - Start time in HH:MM:SS format
 * @param {string} scheduleData.end_time - End time in HH:MM:SS format
 * @param {number|null} excludeScheduleId - Schedule ID to exclude (for updates)
 * @returns {Promise<{isValid: boolean, errors: Array<string>, details: Object}>}
 */
export async function validateSchedule(scheduleData, excludeScheduleId = null) {
    const errors = [];
    const details = {};
    const scheduleDate = normalizeDateInput(scheduleData.date);

    try {
        // 1. Validate time logic (end_time > start_time)
        if (scheduleData.end_time <= scheduleData.start_time) {
            errors.push('End time must be after start time');
        }

        // 2. Check room conflicts
        const roomConflictCheck = await checkRoomConflict(
            scheduleData.room_id,
            scheduleDate,
            scheduleData.start_time,
            scheduleData.end_time,
            excludeScheduleId
        );

        if (roomConflictCheck.hasConflict) {
            const conflictDetails = roomConflictCheck.conflictingSchedules.map(s =>
                `${s.room_code} on ${s.date} from ${s.start_time} to ${s.end_time} (${s.course_name})`
            ).join(', ');
            errors.push(`Room conflict detected: ${conflictDetails}`);
            details.roomConflicts = roomConflictCheck.conflictingSchedules;
        }

        // 3. Check instructor conflicts
        const instructorConflictCheck = await checkInstructorConflict(
            scheduleData.instructor_id,
            scheduleDate,
            scheduleData.start_time,
            scheduleData.end_time,
            excludeScheduleId
        );

        if (instructorConflictCheck.hasConflict) {
            const conflictDetails = instructorConflictCheck.conflictingSchedules.map(s =>
                `${s.instructor_name} on ${s.date} from ${s.start_time} to ${s.end_time} (${s.course_name} in ${s.room_code})`
            ).join(', ');
            errors.push(`Instructor conflict detected: ${conflictDetails}`);
            details.instructorConflicts = instructorConflictCheck.conflictingSchedules;
        }

        // 4. Validate room capacity
        const capacityCheck = await validateRoomCapacity(
            scheduleData.room_id,
            scheduleData.course_id
        );

        if (!capacityCheck.isValid) {
            errors.push(capacityCheck.message);
            details.capacityValidation = capacityCheck;
        }

        // 5. Validate instructor assignment
        const assignmentCheck = await validateInstructorAssignment(
            scheduleData.instructor_id,
            scheduleData.course_id
        );

        if (!assignmentCheck.isAssigned) {
            errors.push(assignmentCheck.message);
            details.assignmentValidation = assignmentCheck;
        }

        return {
            isValid: errors.length === 0,
            errors,
            details
        };
    } catch (error) {
        return {
            isValid: false,
            errors: [`Validation failed: ${error.message}`],
            details: { error: error.message }
        };
    }
}

/**
 * Detect conflicts within an in-memory batch of schedules.
 * Used by bulk creation to ensure atomicity before hitting the database.
 *
 * @param {Array<Object>} schedules - Schedule payloads augmented with __index metadata
 * @returns {Array<Object>} Conflict descriptors
 */
export function detectInternalScheduleConflicts(schedules = []) {
    const conflicts = [];

    for (let i = 0; i < schedules.length; i++) {
        const first = schedules[i];
        const firstDate = normalizeDateInput(first.date);

        for (let j = i + 1; j < schedules.length; j++) {
            const second = schedules[j];
            const secondDate = normalizeDateInput(second.date);

            if (!firstDate || !secondDate || firstDate !== secondDate) {
                continue;
            }

            if (
                first.room_id === second.room_id &&
                checkTimeOverlap(first.start_time, first.end_time, second.start_time, second.end_time)
            ) {
                conflicts.push({
                    type: 'room',
                    aIndex: first.__index ?? i,
                    bIndex: second.__index ?? j,
                    date: firstDate,
                    room_id: first.room_id,
                    timeRangeA: `${first.start_time} - ${first.end_time}`,
                    timeRangeB: `${second.start_time} - ${second.end_time}`
                });
            }

            if (
                first.instructor_id === second.instructor_id &&
                checkTimeOverlap(first.start_time, first.end_time, second.start_time, second.end_time)
            ) {
                conflicts.push({
                    type: 'instructor',
                    aIndex: first.__index ?? i,
                    bIndex: second.__index ?? j,
                    date: firstDate,
                    instructor_id: first.instructor_id,
                    timeRangeA: `${first.start_time} - ${first.end_time}`,
                    timeRangeB: `${second.start_time} - ${second.end_time}`
                });
            }
        }
    }

    return conflicts;
}
