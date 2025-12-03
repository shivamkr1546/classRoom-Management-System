/**
 * Database Connection Test
 * Run this to diagnose MySQL connection issues
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
    console.log('🔍 Testing MySQL Connection...\n');
    console.log('Configuration:');
    console.log('  Host:', process.env.DB_HOST || 'localhost');
    console.log('  Port:', process.env.DB_PORT || '3306');
    console.log('  User:', process.env.DB_USER || 'root');
    console.log('  Password:', process.env.DB_PASSWORD ? '***' : '(empty)');
    console.log('  Database:', process.env.DB_NAME || 'classroom_db');
    console.log('');

    try {
        // First, try to connect without selecting a database
        console.log('Step 1: Testing basic MySQL connection...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });
        console.log('✅ Connected to MySQL server!\n');

        // Check if database exists
        console.log('Step 2: Checking if database exists...');
        const [databases] = await connection.query('SHOW DATABASES');
        const dbExists = databases.some(db => db.Database === (process.env.DB_NAME || 'classroom_db'));
        
        if (dbExists) {
            console.log(`✅ Database '${process.env.DB_NAME}' exists\n`);
        } else {
            console.log(`❌ Database '${process.env.DB_NAME}' does NOT exist`);
            console.log('   Run: CREATE DATABASE classroom_db;\n');
        }

        // List all databases
        console.log('Available databases:');
        databases.forEach(db => {
            const marker = db.Database === (process.env.DB_NAME || 'classroom_db') ? ' ← target' : '';
            console.log(`  - ${db.Database}${marker}`);
        });

        await connection.end();

        console.log('\n✅ Connection test PASSED');
        console.log('   Your MySQL is running and accessible');
        console.log('   You can now run: npm run migrate\n');
        process.exit(0);

    } catch (error) {
        console.log('\n❌ Connection test FAILED\n');
        console.log('Error Code:', error.code);
        console.log('Error Message:', error.message);
        console.log('');

        // Provide specific troubleshooting
        if (error.code === 'ECONNREFUSED') {
            console.log('🔥 DIAGNOSIS: MySQL server is not running or not accessible\n');
            console.log('Solutions:');
            console.log('1. Start MySQL service:');
            console.log('   - Open services.msc');
            console.log('   - Find MySQL80 (or MySQL57)');
            console.log('   - Right-click → Start');
            console.log('');
            console.log('2. OR try changing DB_HOST in .env:');
            console.log('   From: DB_HOST=localhost');
            console.log('   To:   DB_HOST=127.0.0.1');
            console.log('');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('🔥 DIAGNOSIS: Wrong username or password\n');
            console.log('Solutions:');
            console.log('1. Test manual login:');
            console.log('   mysql -u root -p');
            console.log('');
            console.log('2. Update .env with correct password:');
            console.log('   DB_PASSWORD=your_actual_password');
            console.log('');
        } else if (error.code === 'ENOTFOUND') {
            console.log('🔥 DIAGNOSIS: Invalid hostname\n');
            console.log('Solution: Change DB_HOST in .env to 127.0.0.1');
            console.log('');
        }

        console.log('Full error details:');
        console.log(error);
        process.exit(1);
    }
}

testConnection();
