/**
 * Automated test script for Phase 2 CRUD APIs
 * Tests all endpoints with different roles and validates error handling
 * 
 * Run with: node scripts/test-phase2-apis.js
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
const testUserEmail = `testuser_${RUN_ID}@classroom.com`;
const testStudentRoll = `TEST${RUN_ID}`;
const testStudentEmail = `teststudent_${RUN_ID}@example.com`;
const bulkStudentPrefix = `BULK_${RUN_ID}_`;

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
    section('AUTHENTICATION TESTS');

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

// User Management tests
async function testUserManagement() {
    section('USER MANAGEMENT TESTS');

    let newUserId;

    await test('List users (admin)', async () => {
        const res = await api.get('/api/users?page=1&limit=10', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 200 || !res.data.data) throw new Error('Failed to list users');
    });

    await test('Create user (admin)', async () => {
        const res = await api.post('/api/users', {
            name: 'Test User',
            email: testUserEmail,
            password: 'test123',
            role: 'instructor'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 201 || !res.data.data.id) throw new Error('Failed to create user');
        newUserId = res.data.data.id;
    });

    await test('Duplicate email rejected', async () => {
        try {
            await api.post('/api/users', {
                name: 'Duplicate User',
                email: testUserEmail,
                password: 'test123',
                role: 'instructor'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            throw new Error('Should have rejected duplicate email');
        } catch (err) {
            if (err.response && err.response.status === 409) return;
            throw err;
        }
    });

    await test('Update user (admin)', async () => {
        const res = await api.put(`/api/users/${newUserId}`, {
            name: 'Updated Test User'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to update user');
    });

    await test('Non-admin cannot create user', async () => {
        try {
            await api.post('/api/users', {
                name: 'Unauthorized User',
                email: 'unauth@classroom.com',
                password: 'test123',
                role: 'instructor'
            }, {
                headers: { Authorization: `Bearer ${coordinatorToken}` }
            });
            throw new Error('Should have rejected non-admin');
        } catch (err) {
            if (err.response && err.response.status === 403) return;
            throw err;
        }
    });

    await test('Delete user (admin)', async () => {
        const res = await api.delete(`/api/users/${newUserId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to delete user');
    });
}

// Room Management tests
async function testRoomManagement() {
    section('ROOM MANAGEMENT TESTS');

    let newRoomId;

    await test('List rooms (all authenticated)', async () => {
        const res = await api.get('/api/rooms?page=1&limit=10', {
            headers: { Authorization: `Bearer ${instructorToken}` }
        });
        if (res.status !== 200 || !res.data.data) throw new Error('Failed to list rooms');
    });

    await test('Create room (coordinator)', async () => {
        const res = await api.post('/api/rooms', {
            code: 'TEST101',
            name: 'Test Room',
            type: 'classroom',
            capacity: 30
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201 || !res.data.data.id) throw new Error('Failed to create room');
        newRoomId = res.data.data.id;
    });

    await test('Search rooms by type', async () => {
        const res = await api.get('/api/rooms?type=classroom&search=Test', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to search rooms');
    });

    await test('Update room (coordinator)', async () => {
        const res = await api.put(`/api/rooms/${newRoomId}`, {
            capacity: 40
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to update room');
    });

    await test('Instructor cannot create room', async () => {
        try {
            await api.post('/api/rooms', {
                code: 'UNAUTHORIZED',
                name: 'Unauthorized Room',
                type: 'lab',
                capacity: 20
            }, {
                headers: { Authorization: `Bearer ${instructorToken}` }
            });
            throw new Error('Should have rejected instructor');
        } catch (err) {
            if (err.response && err.response.status === 403) return;
            throw err;
        }
    });

    await test('Delete room (admin)', async () => {
        const res = await api.delete(`/api/rooms/${newRoomId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to delete room');
    });
}

// Course Management tests
async function testCourseManagement() {
    section('COURSE MANAGEMENT TESTS');

    let newCourseId;
    let instructorId;

    await test('Get instructor ID', async () => {
        const res = await api.get('/api/users?role=instructor', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (!res.data.data || res.data.data.length === 0) throw new Error('No instructors found');
        instructorId = res.data.data[0].id;
    });

    await test('List courses', async () => {
        const res = await api.get('/api/courses?page=1&limit=10', {
            headers: { Authorization: `Bearer ${instructorToken}` }
        });
        if (res.status !== 200 || !res.data.data) throw new Error('Failed to list courses');
    });

    await test('Create course (coordinator)', async () => {
        const res = await api.post('/api/courses', {
            code: 'TEST101',
            name: 'Test Course',
            required_capacity: 30
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201 || !res.data.data.id) throw new Error('Failed to create course');
        newCourseId = res.data.data.id;
    });

    await test('Assign instructor to course', async () => {
        const res = await api.post(`/api/courses/${newCourseId}/instructors/${instructorId}`, {}, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201) throw new Error('Failed to assign instructor');
    });

    await test('Get course with instructors', async () => {
        const res = await api.get(`/api/courses/${newCourseId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 200 || !res.data.data.instructors) throw new Error('Failed to get course');
        if (res.data.data.instructors.length === 0) throw new Error('Instructor not assigned');
    });

    await test('Update course (admin)', async () => {
        const res = await api.put(`/api/courses/${newCourseId}`, {
            name: 'Updated Test Course'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to update course');
    });

    await test('Unassign instructor from course', async () => {
        const res = await api.delete(`/api/courses/${newCourseId}/instructors/${instructorId}`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to unassign instructor');
    });

    await test('Delete course (admin)', async () => {
        const res = await api.delete(`/api/courses/${newCourseId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to delete course');
    });
}

// Student Management tests
async function testStudentManagement() {
    section('STUDENT MANAGEMENT TESTS');

    let newStudentId;

    await test('List students', async () => {
        const res = await api.get('/api/students?page=1&limit=10', {
            headers: { Authorization: `Bearer ${instructorToken}` }
        });
        if (res.status !== 200 || !res.data.data) throw new Error('Failed to list students');
    });

    await test('Create student (coordinator)', async () => {
        const res = await api.post('/api/students', {
            roll_no: testStudentRoll,
            name: 'Test Student',
            email: testStudentEmail,
            class_label: 'CS101'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201 || !res.data.data.id) throw new Error('Failed to create student');
        newStudentId = res.data.data.id;
    });

    await test('Bulk import students (coordinator)', async () => {
        const res = await api.post('/api/students/bulk', [
            { roll_no: `${bulkStudentPrefix}001`, name: `Bulk Student 1 ${RUN_ID}`, class_label: 'CS101' },
            { roll_no: `${bulkStudentPrefix}002`, name: `Bulk Student 2 ${RUN_ID}`, class_label: 'CS101' },
            { roll_no: `${bulkStudentPrefix}003`, name: `Bulk Student 3 ${RUN_ID}`, class_label: 'CS102' }
        ], {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 201 || res.data.data.imported !== 3) throw new Error('Failed bulk import');
    });

    await test('Bulk import rejects duplicates', async () => {
        try {
            await api.post('/api/students/bulk', [
                { roll_no: `${bulkStudentPrefix}001`, name: 'Duplicate Student', class_label: 'CS101' }
            ], {
                headers: { Authorization: `Bearer ${coordinatorToken}` }
            });
            throw new Error('Should have rejected duplicate');
        } catch (err) {
            if (err.response && err.response.status === 409) return;
            throw err;
        }
    });

    await test('Filter students by class_label', async () => {
        const res = await api.get('/api/students?class_label=CS101', {
            headers: { Authorization: `Bearer ${instructorToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to filter students');
    });

    await test('Update student (coordinator)', async () => {
        const res = await api.put(`/api/students/${newStudentId}`, {
            name: 'Updated Test Student'
        }, {
            headers: { Authorization: `Bearer ${coordinatorToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to update student');
    });

    await test('Instructor cannot delete student', async () => {
        try {
            await api.delete(`/api/students/${newStudentId}`, {
                headers: { Authorization: `Bearer ${instructorToken}` }
            });
            throw new Error('Should have rejected instructor');
        } catch (err) {
            if (err.response && err.response.status === 403) return;
            throw err;
        }
    });

    await test('Delete student (admin)', async () => {
        const res = await api.delete(`/api/students/${newStudentId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (res.status !== 200) throw new Error('Failed to delete student');
    });

    // Clean up bulk imported students
    await test('Cleanup bulk students', async () => {
        const res = await api.get(`/api/students?search=${bulkStudentPrefix}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        for (const student of res.data.data) {
            await api.delete(`/api/students/${student.id}`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
        }
    });
}

// Main test runner
async function runTests() {
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║     Phase 2 API Test Suite                                 ║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝\n'));

    log(chalk.gray(`Testing API at: ${BASE_URL}\n`));

    try {
        await testAuthentication();
        await testUserManagement();
        await testRoomManagement();
        await testCourseManagement();
        await testStudentManagement();
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
