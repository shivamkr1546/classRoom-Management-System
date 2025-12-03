/**
 * Automated test script for Phase 3 Scheduling Engine APIs
 * Tests all schedule endpoints with conflict detection and validation
 * 
 * Run with: node scripts/test-phase3-apis.js
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

const RUN_ID = Date.now();
const baseDate = new Date();
// Shift base date by random amount (0-10 days) to avoid collisions with previous runs
baseDate.setDate(baseDate.getDate() + 30 + (RUN_ID % 10));
const dateOffset = (days = 0) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + days);
    return date.toISOString().slice(0, 10);
};

const scheduleDates = {
    coordinator: dateOffset(0),
    admin: dateOffset(1),
    instructorForbidden: dateOffset(2),
    invalidRange: dateOffset(3),
    roomConflict: dateOffset(4),
    instructorConflict: dateOffset(5),
    capacity: dateOffset(6),
    assignment: dateOffset(7),
    bulkStart: dateOffset(10),
    bulkConflict: dateOffset(15)
};

const bulkScheduleDates = [
    scheduleDates.bulkStart,
    dateOffset(11),
    dateOffset(12)
];

const filterStartDate = dateOffset(-1);
const filterEndDate = dateOffset(30);

const uniqueCode = (prefix) => `${prefix}_${RUN_ID}`;
const capacityCourseCode = uniqueCode('CAPACITY_TEST');
const smallRoomCode = uniqueCode('SMALL_ROOM');
const largeRoomCode = uniqueCode('LARGE_ROOM');
const assignmentCourseCode = uniqueCode('ASSIGN_TEST');

// Test data IDs (will be populated during tests)
let testRoomId = null;
let testCourseId = null;
let testInstructorId = null;
let testScheduleId = null;
let adminScheduleId = null;

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

// Authentication tests
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

    await test('Get existing room', async () => {
        const res = await api.get('/api/rooms', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (!res.data.data || res.data.data.length === 0) throw new Error('No rooms found');
        testRoomId = res.data.data[0].id;
        log(chalk.gray(`  Using Room ID: ${testRoomId}`));
    });

    await test('Get existing course', async () => {
        const res = await api.get('/api/courses', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (!res.data.data || res.data.data.length === 0) throw new Error('No courses found');
        testCourseId = res.data.data[0].id;
        log(chalk.gray(`  Using Course ID: ${testCourseId}`));
    });

    await test('Get instructor ID', async () => {
        const res = await api.get('/api/users?role=instructor', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (!res.data.data || res.data.data.length === 0) throw new Error('No instructors found');
        testInstructorId = res.data.data[0].id;
        log(chalk.gray(`  Using Instructor ID: ${testInstructorId}`));
    });

    await test('Assign instructor to course', async () => {
        try {
            await api.post(`/api/courses/${testCourseId}/instructors/${testInstructorId}`, {}, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
        } catch (err) {
            // Might already be assigned, that's okay
            if (err.response && err.response.status === 409) return;
            throw err;
        }
    });
}

// Schedule Creation Tests
async function testScheduleCreation() {
    section('SCHEDULE CREATION TESTS');

    await test('Create valid schedule (coordinator)', async () => {
        const res = await api.post('/api/schedules', {
            room_id: testRoomId,
            course_id: testCourseId,
            instructor_id: testInstructorId,
            date: scheduleDates.coordinator,
            start_time: '09:00:00',
            end_time: '10:00:00'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201 || !res.data.data.id) throw new Error('Failed to create schedule');
        testScheduleId = res.data.data.id;
        log(chalk.gray(`  Created Schedule ID: ${testScheduleId}`));
    });

    await test('Create valid schedule (admin)', async () => {
        const res = await api.post('/api/schedules', {
            room_id: testRoomId,
            course_id: testCourseId,
            instructor_id: testInstructorId,
            date: scheduleDates.admin,
            start_time: '14:00:00',
            end_time: '15:00:00'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 201) throw new Error('Admin should be able to create schedule');
        adminScheduleId = res.data.data.id;
    });

    await test('Instructor cannot create schedule (403)', async () => {
        try {
            await api.post('/api/schedules', {
                room_id: testRoomId,
                course_id: testCourseId,
                instructor_id: testInstructorId,
                date: scheduleDates.instructorForbidden,
                start_time: '10:00:00',
                end_time: '11:00:00'
            }, {
                headers: { Authorization: `Bearer ${instructorToken}` }
            });
            throw new Error('Instructor should not be able to create schedule');
        } catch (err) {
            if (err.response && err.response.status === 403) return;
            throw err;
        }
    });

    await test('Invalid time range rejected', async () => {
        try {
            await api.post('/api/schedules', {
                room_id: testRoomId,
                course_id: testCourseId,
                instructor_id: testInstructorId,
                date: scheduleDates.invalidRange,
                start_time: '11:00:00',
                end_time: '10:00:00' // End before start
            }, {
                headers: { Authorization: `Bearer ${coordinatorToken}` }
            });
            throw new Error('Should reject invalid time range');
        } catch (err) {
            if (err.response && err.response.status === 409) return;
            throw err;
        }
    });

    // Cleanup
    await test('Cleanup valid schedules', async () => {
        if (testScheduleId) {
            await api.delete(`/api/schedules/${testScheduleId}`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
        }
        if (adminScheduleId) {
            await api.delete(`/api/schedules/${adminScheduleId}`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
        }
    });
}

// Room Conflict Detection Tests
async function testRoomConflicts() {
    section('ROOM CONFLICT DETECTION TESTS');

    let schedule1Id, schedule2Id;

    await test('Create schedule in Room A at 09:00-10:00', async () => {
        const res = await api.post('/api/schedules', {
            room_id: testRoomId,
            course_id: testCourseId,
            instructor_id: testInstructorId,
            date: scheduleDates.roomConflict,
            start_time: '09:00:00',
            end_time: '10:00:00'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201) throw new Error('Failed to create schedule');
        schedule1Id = res.data.data.id;
    });

    await test('Reject overlapping schedule in same room (09:30-10:30)', async () => {
        try {
            await api.post('/api/schedules', {
                room_id: testRoomId,
                course_id: testCourseId,
                instructor_id: testInstructorId,
                date: scheduleDates.roomConflict,
                start_time: '09:30:00',
                end_time: '10:30:00'
            }, {
                headers: { Authorization: `Bearer ${coordinatorToken}` }
            });
            throw new Error('Should reject room conflict');
        } catch (err) {
            if (err.response && err.response.status === 409) {
                if (!err.response.data.errors.some(e => e.includes('Room conflict'))) {
                    throw new Error('Expected room conflict error');
                }
                return;
            }
            throw err;
        }
    });

    await test('Allow non-overlapping schedule (10:00-11:00 touching boundary)', async () => {
        const res = await api.post('/api/schedules', {
            room_id: testRoomId,
            course_id: testCourseId,
            instructor_id: testInstructorId,
            date: scheduleDates.roomConflict,
            start_time: '10:00:00',
            end_time: '11:00:00'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201) throw new Error('Touching boundaries should not conflict');
        schedule2Id = res.data.data.id;
    });

    // Cleanup
    await test('Cleanup room conflict test schedules', async () => {
        await api.delete(`/api/schedules/${schedule1Id}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        await api.delete(`/api/schedules/${schedule2Id}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
    });
}

// Instructor Conflict Detection Tests
async function testInstructorConflicts() {
    section('INSTRUCTOR CONFLICT DETECTION TESTS');

    let scheduleId1, testRoom2Id;

    // Get a second room
    await test('Get second room for instructor conflict test', async () => {
        const res = await api.get('/api/rooms', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.data.data.length < 2) throw new Error('Need at least 2 rooms for this test');
        testRoom2Id = res.data.data[1].id;
        log(chalk.gray(`  Using second Room ID: ${testRoom2Id}`));
    });

    await test('Create schedule with Instructor X at 14:00-15:00', async () => {
        const res = await api.post('/api/schedules', {
            room_id: testRoomId,
            course_id: testCourseId,
            instructor_id: testInstructorId,
            date: scheduleDates.instructorConflict,
            start_time: '14:00:00',
            end_time: '15:00:00'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201) throw new Error('Failed to create schedule');
        scheduleId1 = res.data.data.id;
    });

    await test('Reject same instructor at overlapping time (different room)', async () => {
        try {
            await api.post('/api/schedules', {
                room_id: testRoom2Id, // Different room
                course_id: testCourseId,
                instructor_id: testInstructorId, // Same instructor
                date: scheduleDates.instructorConflict,
                start_time: '14:30:00',
                end_time: '15:30:00'
            }, {
                headers: { Authorization: `Bearer ${coordinatorToken}` }
            });
            throw new Error('Should reject instructor conflict');
        } catch (err) {
            if (err.response && err.response.status === 409) {
                if (!err.response.data.errors.some(e => e.includes('Instructor conflict'))) {
                    throw new Error('Expected instructor conflict error');
                }
                return;
            }
            throw err;
        }
    });

    await test('Allow same instructor at different time (different room)', async () => {
        const res = await api.post('/api/schedules', {
            room_id: testRoom2Id,
            course_id: testCourseId,
            instructor_id: testInstructorId,
            date: scheduleDates.instructorConflict,
            start_time: '16:00:00',
            end_time: '17:00:00'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201) throw new Error('Should allow same instructor at different time');

        // Cleanup
        await api.delete(`/api/schedules/${res.data.data.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
    });

    await test('Cleanup instructor conflict test schedule', async () => {
        await api.delete(`/api/schedules/${scheduleId1}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
    });
}

// Capacity Validation Tests
async function testCapacityValidation() {
    section('CAPACITY VALIDATION TESTS');

    let largeCapacityCourseId, smallRoomId, largeRoomId;

    await test('Create course with required_capacity=50', async () => {
        const res = await api.post('/api/courses', {
            code: capacityCourseCode,
            name: 'Capacity Test Course',
            required_capacity: 50
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201) throw new Error('Failed to create course');
        largeCapacityCourseId = res.data.data.id;
    });

    await test('Assign instructor to capacity test course', async () => {
        await api.post(`/api/courses/${largeCapacityCourseId}/instructors/${testInstructorId}`, {}, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
    });

    await test('Create small room (capacity=30)', async () => {
        const res = await api.post('/api/rooms', {
            code: smallRoomCode,
            name: 'Small Test Room',
            type: 'classroom',
            capacity: 30
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201) throw new Error('Failed to create room');
        smallRoomId = res.data.data.id;
    });

    await test('Create large room (capacity=60)', async () => {
        const res = await api.post('/api/rooms', {
            code: largeRoomCode,
            name: 'Large Test Room',
            type: 'classroom',
            capacity: 60
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201) throw new Error('Failed to create room');
        largeRoomId = res.data.data.id;
    });

    await test('Reject schedule: room capacity < course requirement', async () => {
        try {
            await api.post('/api/schedules', {
                room_id: smallRoomId,
                course_id: largeCapacityCourseId,
                instructor_id: testInstructorId,
                date: scheduleDates.capacity,
                start_time: '10:00:00',
                end_time: '11:00:00'
            }, {
                headers: { Authorization: `Bearer ${coordinatorToken}` }
            });
            throw new Error('Should reject insufficient capacity');
        } catch (err) {
            if (err.response && err.response.status === 409) {
                if (!err.response.data.errors.some(e => e.includes('capacity'))) {
                    throw new Error('Expected capacity validation error');
                }
                return;
            }
            throw err;
        }
    });

    await test('Allow schedule: room capacity >= course requirement', async () => {
        const res = await api.post('/api/schedules', {
            room_id: largeRoomId,
            course_id: largeCapacityCourseId,
            instructor_id: testInstructorId,
            date: scheduleDates.capacity,
            start_time: '10:00:00',
            end_time: '11:00:00'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201) throw new Error('Should allow sufficient capacity');

        // Cleanup
        await api.delete(`/api/schedules/${res.data.data.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
    });

    // Cleanup test data
    await test('Cleanup capacity test data', async () => {
        await api.delete(`/api/courses/${largeCapacityCourseId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        await api.delete(`/api/rooms/${smallRoomId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        await api.delete(`/api/rooms/${largeRoomId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
    });
}

// Instructor Assignment Validation Tests
async function testInstructorAssignment() {
    section('INSTRUCTOR ASSIGNMENT VALIDATION TESTS');

    let unassignedInstructorId, testCourse2Id;

    await test('Get second instructor (unassigned)', async () => {
        const res = await api.get('/api/users?role=instructor', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.data.data.length < 2) {
            log(chalk.yellow('  ⚠ Only 1 instructor - skipping unassigned instructor test'));
            return;
        }
        unassignedInstructorId = res.data.data.find(i => i.id !== testInstructorId)?.id;
    });

    await test('Create test course', async () => {
        const res = await api.post('/api/courses', {
            code: assignmentCourseCode,
            name: 'Assignment Test Course',
            required_capacity: 30
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        testCourse2Id = res.data.data.id;
    });

    if (unassignedInstructorId) {
        await test('Reject schedule: instructor not assigned to course', async () => {
            try {
                await api.post('/api/schedules', {
                    room_id: testRoomId,
                    course_id: testCourse2Id,
                    instructor_id: unassignedInstructorId,
                    date: scheduleDates.assignment,
                    start_time: '09:00:00',
                    end_time: '10:00:00'
                }, {
                    headers: { Authorization: `Bearer ${coordinatorToken}` }
                });
                throw new Error('Should reject unassigned instructor');
            } catch (err) {
                if (err.response && err.response.status === 409) {
                    if (!err.response.data.errors.some(e => e.includes('not assigned'))) {
                        throw new Error('Expected assignment validation error');
                    }
                    return;
                }
                throw err;
            }
        });
    }

    await test('Assign instructor and create schedule successfully', async () => {
        await api.post(`/api/courses/${testCourse2Id}/instructors/${testInstructorId}`, {}, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });

        const res = await api.post('/api/schedules', {
            room_id: testRoomId,
            course_id: testCourse2Id,
            instructor_id: testInstructorId,
            date: scheduleDates.assignment,
            start_time: '11:00:00',
            end_time: '12:00:00'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201) throw new Error('Should allow assigned instructor');

        // Cleanup
        await api.delete(`/api/schedules/${res.data.data.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
    });

    await test('Cleanup assignment test course', async () => {
        await api.delete(`/api/courses/${testCourse2Id}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
    });
}

// Schedule Management Tests
async function testScheduleManagement() {
    section('SCHEDULE MANAGEMENT TESTS');

    await test('List schedules', async () => {
        const res = await api.get('/api/schedules?page=1&limit=10', {
            headers: { Authorization: `Bearer ${instructorToken}` }
        });
        if (res.status !== 200 || !res.data.data) throw new Error('Failed to list schedules');
    });

    await test('Filter schedules by date range', async () => {
        const res = await api.get(`/api/schedules?start_date=${filterStartDate}&end_date=${filterEndDate}`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to filter by date');
    });

    await test('Filter schedules by room', async () => {
        const res = await api.get(`/api/schedules?room_id=${testRoomId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to filter by room');
    });

    await test('Get schedule by ID', async () => {
        if (!testScheduleId) throw new Error('No test schedule ID available');
        const res = await api.get(`/api/schedules/${testScheduleId}`, {
            headers: { Authorization: `Bearer ${instructorToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to get schedule');
    });

    await test('Update schedule time', async () => {
        const res = await api.put(`/api/schedules/${testScheduleId}`, {
            start_time: '10:00:00',
            end_time: '11:00:00'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to update schedule');
    });

    await test('Instructor cannot update schedule (403)', async () => {
        try {
            await api.put(`/api/schedules/${testScheduleId}`, {
                start_time: '11:00:00'
            }, {
                headers: { Authorization: `Bearer ${instructorToken}` }
            });
            throw new Error('Instructor should not be able to update');
        } catch (err) {
            if (err.response && err.response.status === 403) return;
            throw err;
        }
    });

    await test('Cancel schedule', async () => {
        const res = await api.delete(`/api/schedules/${testScheduleId}`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to cancel schedule');
    });
}

// Bulk Schedule Creation Tests
async function testBulkScheduleCreation() {
    section('BULK SCHEDULE CREATION TESTS');

    await test('Bulk create valid schedules', async () => {
        const res = await api.post('/api/schedules/bulk', [
            {
                room_id: testRoomId,
                course_id: testCourseId,
                instructor_id: testInstructorId,
                date: bulkScheduleDates[0],
                start_time: '09:00:00',
                end_time: '10:00:00'
            },
            {
                room_id: testRoomId,
                course_id: testCourseId,
                instructor_id: testInstructorId,
                date: bulkScheduleDates[1],
                start_time: '09:00:00',
                end_time: '10:00:00'
            },
            {
                room_id: testRoomId,
                course_id: testCourseId,
                instructor_id: testInstructorId,
                date: bulkScheduleDates[2],
                start_time: '09:00:00',
                end_time: '10:00:00'
            }
        ], {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201 || res.data.data.created !== 3) throw new Error('Failed bulk create');
        log(chalk.gray(`  Created ${res.data.data.created} schedules`));

        // Cleanup
        for (const id of res.data.data.ids) {
            await api.delete(`/api/schedules/${id}`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
        }
    });

    await test('Bulk create rejects with conflict (transaction rollback)', async () => {
        try {
            await api.post('/api/schedules/bulk', [
                {
                    room_id: testRoomId,
                    course_id: testCourseId,
                    instructor_id: testInstructorId,
                    date: scheduleDates.bulkConflict,
                    start_time: '14:00:00',
                    end_time: '15:00:00'
                },
                {
                    room_id: testRoomId,
                    course_id: testCourseId,
                    instructor_id: testInstructorId,
                    date: scheduleDates.bulkConflict,
                    start_time: '14:30:00', // Conflicts with first
                    end_time: '15:30:00'
                }
            ], {
                headers: { Authorization: `Bearer ${coordinatorToken}` }
            });
            throw new Error('Should reject bulk with conflict');
        } catch (err) {
            if (err.response && err.response.status === 409) {
                if (!err.response.data.errors || err.response.data.errors.length === 0) {
                    throw new Error('Expected validation errors in response');
                }
                return;
            }
            throw err;
        }
    });
}

// Main test runner
async function runTests() {
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║     Phase 3 Scheduling Engine Test Suite                  ║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝\n'));

    log(chalk.gray(`Testing API at: ${BASE_URL}\n`));

    try {
        await testAuthentication();
        await setupTestData();
        await testScheduleCreation();
        await testRoomConflicts();
        await testInstructorConflicts();
        await testCapacityValidation();
        await testInstructorAssignment();
        await testScheduleManagement();
        await testBulkScheduleCreation();
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
