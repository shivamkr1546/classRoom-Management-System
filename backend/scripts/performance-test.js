/**
 * Performance Test Script
 * Tests API response times and concurrency handling
 * 
 * Run with: node scripts/performance-test.js
 */

import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = 'http://localhost:5000/api';
const CONCURRENCY = 50; // Number of concurrent requests
const ITERATIONS = 3;   // Number of test iterations

let adminToken = '';

async function login() {
    const start = performance.now();
    const res = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@classroom.com',
        password: 'admin123'
    });
    const end = performance.now();
    adminToken = res.data.data.token;
    return end - start;
}

async function measure(name, fn) {
    console.log(chalk.blue(`\nTesting: ${name}`));
    const times = [];

    for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        await fn();
        const end = performance.now();
        times.push(end - start);
        process.stdout.write('.');
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(chalk.green(`\n  Avg: ${avg.toFixed(2)}ms | Min: ${min.toFixed(2)}ms | Max: ${max.toFixed(2)}ms`));

    if (avg > 500) console.log(chalk.yellow('  ⚠️  Warning: Response time > 500ms'));
    if (avg > 1000) console.log(chalk.red('  ❌  Critical: Response time > 1000ms'));
}

async function runConcurrent(name, fn, count = CONCURRENCY) {
    console.log(chalk.blue(`\nTesting Concurrent: ${name} (${count} requests)`));

    const start = performance.now();
    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push(fn(i));
    }

    try {
        await Promise.all(promises);
        const end = performance.now();
        const totalTime = end - start;
        const rps = (count / totalTime) * 1000;

        console.log(chalk.green(`  Total Time: ${totalTime.toFixed(2)}ms`));
        console.log(chalk.green(`  RPS: ${rps.toFixed(2)} req/sec`));
    } catch (err) {
        console.log(chalk.red(`  ❌ Failed: ${err.message}`));
        if (err.response) console.log(chalk.red(`  Status: ${err.response.status}`));
    }
}

async function runTests() {
    console.log(chalk.bold.cyan('🚀 Starting Performance Tests...'));

    try {
        // 1. Login Performance
        await measure('Login', login);

        const headers = { Authorization: `Bearer ${adminToken}` };

        // 2. Dashboard Summary (Heavy Read)
        await measure('Dashboard Summary', async () => {
            await axios.get(`${BASE_URL}/analytics/summary`, { headers });
        });

        // 3. Schedule Listing (Heavy Read with Joins)
        await measure('List Schedules (Page 1)', async () => {
            await axios.get(`${BASE_URL}/schedules?page=1&limit=50`, { headers });
        });

        // 4. Concurrent Reads
        await runConcurrent('Concurrent Schedule Reads', async () => {
            await axios.get(`${BASE_URL}/schedules?limit=10`, { headers });
        });

        // 5. Concurrent Analytics
        await runConcurrent('Concurrent Analytics Reads', async () => {
            await axios.get(`${BASE_URL}/analytics/summary`, { headers });
        });

        console.log(chalk.bold.green('\n✅ Performance Tests Completed'));

    } catch (err) {
        console.error(chalk.red('\n❌ Test Suite Failed:'), err.message);
    }
}

runTests();
