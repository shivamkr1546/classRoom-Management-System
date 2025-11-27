import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'classroom_db',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();

    // Set transaction isolation level for concurrency safety
    // READ COMMITTED prevents phantom reads in scheduling conflicts
    await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');

    // Set timezone to prevent date/time issues
    await connection.query('SET time_zone = "+00:00"');

    console.log('✅ Database connected successfully');
    console.log('✅ Transaction isolation level: READ COMMITTED');

    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

export default pool;
