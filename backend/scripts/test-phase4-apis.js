/**
 * Production-Grade Phase 4 Test Suite
 * Tests Enrollment, Attendance, and Analytics APIs
 * 
 * Fixes:
 * - Correct HTTP status codes (200/201 for upserts)
 * - Correct routes and request formats
 * - Correct HTTP verbs (PUT for updates)
 * - DB state verification
 * - Edge case testing (future schedules, withdrawals, etc.)
 * - Handles both 401 and 403 for permissions
 * - Tests analytics object vs array responses correctly
 * 
 * Run with: node scripts/test-phase4-apis.js
 */

import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

let adminToken = '';
let coordinatorToken = '';
let instructorToken = '';

// Test data IDs
let testCourseId = null;
let testStudentId = null;
let testStudent2Id = null;
let testStudent3Id = null;
let testScheduleId = null;
let testPastScheduleId = null;
let testFutureScheduleId = null;
let testEnrollmentId = null;
let testAttendanceId = null;
let testRoomId = null;
let testInstructorId = null;
let testUnenrolledStudentId = null;

const RUN_ID = Date.now();
const uniqueValue = (prefix) => `${prefix}_${RUN_ID}`;
const dateOffset = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};
const daySkew = RUN_ID % 5;
const MINUTES_IN_DAY = 24 * 60;
const formatTime = (minutes) => {
    const normalized = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
    const hours = Math.floor(normalized / 60).toString().padStart(2, '0');
    const mins = (normalized % 60).toString().padStart(2, '0');
    return `${hours}:${mins}:00`;
};
const timeOffset = RUN_ID % MINUTES_IN_DAY;
const pastStartMinutes = (8 * 60 + (timeOffset % 180)) % MINUTES_IN_DAY;
const futureStartMinutes = (14 * 60 + (timeOffset % 180)) % MINUTES_IN_DAY;
const pastScheduleWindow = {
    start: formatTime(pastStartMinutes),
    end: formatTime(pastStartMinutes + 60)
};
const futureScheduleWindow = {
    start: formatTime(futureStartMinutes),
    end: formatTime(futureStartMinutes + 60)
};

const pastScheduleDate = dateOffset(-7 - daySkew);
const futureScheduleDate = dateOffset(7 + daySkew);
const analyticsStartDate = dateOffset(-30);
const analyticsEndDate = dateOffset(30);
const courseCode = uniqueValue('PHASE4_COURSE');
const roomCode = uniqueValue('PHASE4_ROOM');
const classLabel = `CLS_${RUN_ID % 1000}`;
const makeStudentPayload = (label) => ({
    roll_no: uniqueValue(`ROLL_${label}`),
    name: `Phase4 Student ${label}`,
    email: `${label.toLowerCase()}.${RUN_ID}@example.com`,
    class_label: classLabel
});

// Test counters
let passed = 0;
let failed = 0;

// Helper functions
function log(message) {
    console.log(message);
}

function success(message) {
    passed++;
    console.log(chalk.green('✓'), message);
}

function error(message, err) {
    failed++;
    console.log(chalk.red('✗'), message);
    if (err) console.log(chalk.gray(`  Error: ${err.message}`));
}

function section(title) {
    console.log('\n' + chalk.bold.blue('━'.repeat(60)));
    console.log(chalk.bold.blue(`  ${title}`));
    console.log(chalk.bold.blue('━'.repeat(60)));
}

async function test(description, testFn) {
    try {
        await testFn();
        success(description);
    } catch (err) {
        error(description, err);
    }
}

// Authentication
async function testAuthentication() {
    section('AUTHENTICATION');

    await test('Admin login', async () => {
        const res = await api.post('/api/auth/login', {
            email: 'admin@classroom.com',
            password: 'admin123'
        });
        if (res.status !== 200 || !res.data.data.token) throw new Error('Login failed');
        adminToken = res.data.data.token;
    });

    await test('Coordinator login', async () => {
        const res = await api.post('/api/auth/login', {
            email: 'jane@classroom.com',
            password: 'admin123'
        });
        if (res.status !== 200 || !res.data.data.token) throw new Error('Login failed');
        coordinatorToken = res.data.data.token;
    });

    await test('Instructor login', async () => {
        const res = await api.post('/api/auth/login', {
            email: 'john@classroom.com',
            password: 'admin123'
        });
        if (res.status !== 200 || !res.data.data.token) throw new Error('Login failed');
        instructorToken = res.data.data.token;
    });
}

// Setup test data
async function setupTestData() {
    section('SETUP TEST DATA');

    await test('Get instructor for testing', async () => {
        const res = await api.get('/api/users?role=instructor', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (!res.data.data || res.data.data.length === 0) throw new Error('No instructors found');
        testInstructorId = res.data.data[0].id;
        log(chalk.gray(`  Using Instructor ID: ${testInstructorId}`));
    });

    await test('Create dedicated test course', async () => {
        const res = await api.post('/api/courses', {
            code: courseCode,
            name: `Phase 4 Course ${RUN_ID}`,
            required_capacity: 40
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (![200, 201].includes(res.status)) throw new Error(`Failed to create course (status ${res.status})`);
        testCourseId = res.data.data.id;
        log(chalk.gray(`  Created Course ID: ${testCourseId}`));
    });

    await test('Assign instructor to test course', async () => {
        try {
            await api.post(`/api/courses/${testCourseId}/instructors/${testInstructorId}`, {}, {
                headers: { Authorization: `Bearer ${coordinatorToken}` }
            });
        } catch (err) {
            if (err.response && err.response.status === 409) return;
            throw err;
        }
    });

    await test('Create students for testing', async () => {
        const labels = ['A', 'B', 'C', 'D'];
        const ids = [];
        for (const label of labels) {
            const res = await api.post('/api/students', makeStudentPayload(label), {
                headers: { Authorization: `Bearer ${coordinatorToken}` }
            });
            if (res.status !== 201 || !res.data.data?.id) throw new Error('Failed to create student');
            ids.push(res.data.data.id);
        }
        if (ids.length < 4) throw new Error('Failed to create required students');
        [testStudentId, testStudent2Id, testStudent3Id, testUnenrolledStudentId] = ids;
        log(chalk.gray(`  Created Student IDs: ${ids.join(', ')}`));
    });

    await test('Create dedicated test room', async () => {
        const res = await api.post('/api/rooms', {
            code: roomCode,
            name: `Phase 4 Room ${RUN_ID}`,
            type: 'classroom',
            capacity: 60
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201 || !res.data.data?.id) throw new Error('Failed to create room');
        testRoomId = res.data.data.id;
        log(chalk.gray(`  Created Room ID: ${testRoomId}`));
    });

    await test('Create past schedule for testing', async () => {
        const res = await api.post('/api/schedules', {
            room_id: testRoomId,
            course_id: testCourseId,
            instructor_id: testInstructorId,
            date: pastScheduleDate,
            start_time: pastScheduleWindow.start,
            end_time: pastScheduleWindow.end
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201 || !res.data.data?.id) throw new Error('Failed to create past schedule');
        testScheduleId = res.data.data.id;
        testPastScheduleId = res.data.data.id;
        log(chalk.gray(`  Created Past Schedule ID: ${testScheduleId} (${pastScheduleWindow.start}-${pastScheduleWindow.end})`));
    });

    await test('Create future schedule for edge case testing', async () => {
        const res = await api.post('/api/schedules', {
            room_id: testRoomId,
            course_id: testCourseId,
            instructor_id: testInstructorId,
            date: futureScheduleDate,
            start_time: futureScheduleWindow.start,
            end_time: futureScheduleWindow.end
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });

        if ([200, 201].includes(res.status)) {
            testFutureScheduleId = res.data.data.id;
            log(chalk.gray(`  Created Future Schedule ID: ${testFutureScheduleId} (${futureScheduleWindow.start}-${futureScheduleWindow.end})`));
        }
    });
}

// Enrollment Tests
async function testEnrollments() {
    section('ENROLLMENT TESTS');

    await test('Enroll student in course (coordinator) - should return 201', async () => {
        const res = await api.post('/api/enrollments', {
            course_id: testCourseId,
            student_id: testStudentId
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (![200, 201].includes(res.status)) throw new Error(`Expected 200/201, got ${res.status}`);
        if (!res.data.data || !res.data.data.id) throw new Error('Missing enrollment ID');
        testEnrollmentId = res.data.data.id;
    });

    await test('Duplicate enrollment (upsert) - should return 200 or 201', async () => {
        const res = await api.post('/api/enrollments', {
            course_id: testCourseId,
            student_id: testStudentId
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        // Upsert can return either 200 or 201
        if (![200, 201].includes(res.status)) throw new Error(`Upsert failed with status ${res.status}`);
    });

    await test('Bulk enroll students - accepts array directly', async () => {
        // Body is an ARRAY not an object
        const res = await api.post('/api/enrollments/bulk', [
            { course_id: testCourseId, student_id: testStudent2Id },
            { course_id: testCourseId, student_id: testStudent3Id }
        ], {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        // Bulk operations typically return 201
        if (![200, 201].includes(res.status)) throw new Error(`Bulk enroll failed with status ${res.status}`);
    });

    await test('Verify enrollment in DB - get course enrollments', async () => {
        // CORRECT ROUTE: /api/enrollments/courses/:id
        const res = await api.get(`/api/enrollments/courses/${testCourseId}`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200 || !Array.isArray(res.data.data)) throw new Error('Failed to get enrollments');
        if (res.data.data.length < 2) throw new Error(`Expected at least 2 enrollments, got ${res.data.data.length}`);
        log(chalk.gray(`  Found ${res.data.data.length} enrollments`));
    });

    await test('Get student enrollments', async () => {
        const res = await api.get(`/api/enrollments/students/${testStudentId}`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200 || !Array.isArray(res.data.data)) throw new Error('Failed to get enrollments');
        if (res.data.data.length < 1) throw new Error('Expected at least 1 enrollment');
    });

    await test('Unenroll student (soft delete) - should return 200', async () => {
        const res = await api.delete(`/api/enrollments/${testEnrollmentId}`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    });

    await test('Verify enrollment status changed to withdrawn', async () => {
        const res = await api.get(`/api/enrollments/courses/${testCourseId}?status=withdrawn`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        const withdrawn = res.data.data.find(e => e.student_id === testStudentId);
        if (!withdrawn) throw new Error('Enrollment not found in withdrawn list');
        if (withdrawn.status !== 'withdrawn') throw new Error(`Expected withdrawn, got ${withdrawn.status}`);
    });

    await test('Re-enroll withdrawn student (status should become active)', async () => {
        const res = await api.post('/api/enrollments', {
            course_id: testCourseId,
            student_id: testStudentId
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (![200, 201].includes(res.status)) throw new Error('Re-enrollment failed');
        if (res.data.data.status !== 'active') throw new Error('Status should be active after re-enrollment');
    });

    await test('Instructor cannot enroll students - should return 401 or 403', async () => {
        try {
            await api.post('/api/enrollments', {
                course_id: testCourseId,
                student_id: testStudentId
            }, {
                headers: { Authorization: `Bearer ${instructorToken}` }
            });
            throw new Error('Instructor should not be able to enroll');
        } catch (err) {
            // Accept BOTH 401 Unauthorized and 403 Forbidden
            if (err.response && [401, 403].includes(err.response.status)) return;
            throw err;
        }
    });
}

// Attendance Tests
async function testAttendance() {
    section('ATTENDANCE TESTS');

    await test('Mark single attendance - should return 201', async () => {
        const res = await api.post('/api/attendance', {
            schedule_id: testScheduleId,
            student_id: testStudentId,
            status: 'present'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (![200, 201].includes(res.status)) throw new Error(`Expected 200/201, got ${res.status}`);
        if (!res.data.data || !res.data.data.id) throw new Error('Missing attendance ID');
        testAttendanceId = res.data.data.id;
    });

    await test('Update attendance using PUT (not POST)', async () => {
        const res = await api.put(`/api/attendance/${testAttendanceId}`, {
            status: 'late'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200) throw new Error(`Update failed with status ${res.status}`);
        if (res.data.data.status !== 'late') throw new Error('Status not updated');
        if (!res.data.data.updated_by) throw new Error('Audit field updated_by not set');
    });

    await test('Re-mark attendance via POST (upsert pattern)', async () => {
        const res = await api.post('/api/attendance', {
            schedule_id: testScheduleId,
            student_id: testStudentId,
            status: 'excused'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        // Upsert should work
        if (![200, 201].includes(res.status)) throw new Error(`Upsert failed with status ${res.status}`);
    });

    await test('Bulk mark attendance', async () => {
        const res = await api.post('/api/attendance/bulk', {
            schedule_id: testScheduleId,
            attendance: [
                { student_id: testStudent2Id, status: 'present' },
                { student_id: testStudent3Id, status: 'absent' }
            ]
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (![200, 201].includes(res.status)) throw new Error(`Bulk failed with status ${res.status}`);
    });

    await test('Verify attendance records in DB', async () => {
        const res = await api.get(`/api/attendance/schedule/${testScheduleId}`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200 || !Array.isArray(res.data.data)) throw new Error('Failed to get attendance');
        if (res.data.data.length < 3) throw new Error(`Expected 3+ attendance records, got ${res.data.data.length}`);
    });

    await test('Get student attendance history', async () => {
        const res = await api.get(`/api/attendance/student/${testStudentId}`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200 || !Array.isArray(res.data.data)) throw new Error('Failed to get history');
    });

    await test('Cannot mark attendance for future schedule (400 error)', async () => {
        if (!testFutureScheduleId) {
            log(chalk.yellow('  ⚠ Skipping future schedule test - no future schedule created'));
            return;
        }

        try {
            await api.post('/api/attendance', {
                schedule_id: testFutureScheduleId,
                student_id: testStudentId,
                status: 'present'
            }, {
                headers: { Authorization: `Bearer ${coordinatorToken}` }
            });
            throw new Error('Should not allow marking attendance for future schedule');
        } catch (err) {
            if (err.response && err.response.status === 400) return;
            throw err;
        }
    });

    await test('Cannot mark attendance for non-enrolled student (409 error)', async () => {
        if (!testUnenrolledStudentId) {
            log(chalk.yellow('  ⚠ No unenrolled student available - skipping test'));
            return;
        }

        try {
            await api.post('/api/attendance', {
                schedule_id: testScheduleId,
                student_id: testUnenrolledStudentId,
                status: 'present'
            }, {
                headers: { Authorization: `Bearer ${coordinatorToken}` }
            });
            throw new Error('Should reject non-enrolled student');
        } catch (err) {
            if (err.response && err.response.status === 409) return;
            throw err;
        }
    });

    await test('Instructor cannot mark attendance - should return 401/403', async () => {
        try {
            await api.post('/api/attendance', {
                schedule_id: testScheduleId,
                student_id: testStudentId,
                status: 'present'
            }, {
                headers: { Authorization: `Bearer ${instructorToken}` }
            });
            throw new Error('Instructor should not be able to mark attendance');
        } catch (err) {
            if (err.response && [401, 403].includes(err.response.status)) return;
            throw err;
        }
    });
}

// Analytics Tests
async function testAnalytics() {
    section('ANALYTICS TESTS');

    await test('Get room utilization - returns ARRAY', async () => {
        const res = await api.get('/api/analytics/rooms', {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (!Array.isArray(res.data.data)) throw new Error('Expected array response');
        log(chalk.gray(`  Found ${res.data.data.length} rooms with utilization data`));
    });

    await test('Get instructor workload - returns ARRAY', async () => {
        const res = await api.get('/api/analytics/instructors', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (!Array.isArray(res.data.data)) throw new Error('Expected array response');
    });

    await test('Get course attendance stats - returns OBJECT (not array)', async () => {
        const res = await api.get(`/api/analytics/courses/${testCourseId}/attendance`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (!res.data.data) throw new Error('Missing data object');
        if (Array.isArray(res.data.data)) throw new Error('Expected object, got array');

        // Verify structure
        if (typeof res.data.data.courseId === 'undefined') throw new Error('Missing courseId');
        if (typeof res.data.data.enrolledCount === 'undefined') throw new Error('Missing enrolledCount');
        if (typeof res.data.data.averageAttendanceRate === 'undefined') throw new Error('Missing averageAttendanceRate');
        if (!Array.isArray(res.data.data.schedules)) throw new Error('Missing schedules array');

        log(chalk.gray(`  Enrolled: ${res.data.data.enrolledCount}, Avg: ${res.data.data.averageAttendanceRate}%`));
    });

    await test('Get student attendance summary - returns OBJECT (not array)', async () => {
        const res = await api.get(`/api/analytics/students/${testStudentId}/attendance`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (!res.data.data) throw new Error('Missing data object');
        if (Array.isArray(res.data.data)) throw new Error('Expected object, got array');

        // Verify structure
        if (!res.data.data.overall) throw new Error('Missing overall summary');
        if (!Array.isArray(res.data.data.perCourse)) throw new Error('Missing perCourse array');

        log(chalk.gray(`  Total: ${res.data.data.overall.total_records}, Rate: ${res.data.data.overall.attendance_percentage}%`));
    });

    await test('Analytics with date range filtering', async () => {
        const res = await api.get(`/api/analytics/rooms?start_date=${analyticsStartDate}&end_date=${analyticsEndDate}`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200) throw new Error('Date filtering failed');
    });
}

// Main test runner
async function runTests() {
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║     Phase 4 Production-Grade Test Suite                   ║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝\n'));

    log(chalk.gray(`Testing API at: ${BASE_URL}\n`));

    try {
        await testAuthentication();
        await setupTestData();
        await testEnrollments();
        await testAttendance();
        await testAnalytics();
    } catch (err) {
        console.error(chalk.red('\n⚠️  Test suite aborted due to critical error:'), err.message);
    }

    // Summary
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║     Test Summary                                           ║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝\n'));

    const total = passed + failed;
    console.log(chalk.green(`  ✓ Passed: ${passed}/${total}`));
    console.log(chalk.red(`  ✗ Failed: ${failed}/${total}`));
    console.log(chalk.cyan(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`));

    if (failed === 0) {
        console.log(chalk.bold.green('\n🎉 All tests passed!\n'));
        process.exit(0);
    } else {
        console.log(chalk.bold.red(`\n❌ ${failed} test(s) failed\n`));
        process.exit(1);
    }
}

// Run the tests
runTests();
