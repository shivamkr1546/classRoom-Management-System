import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbName = process.env.DB_NAME || 'classroom_db';

/**
 * Run SQL migration files
 * First creates the database, then runs table migrations
 */
async function runMigrations() {
    const migrationsDir = path.join(__dirname, '../migrations');

    try {
        // Step 1: Create database if it doesn't exist
        logger.info('Creating database if not exists...');
        await pool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        logger.info(`✅ Database ${dbName} ready`);

        // Step 2: Switch to the database
        await pool.query(`USE \`${dbName}\``);
        logger.info(`✅ Connected to ${dbName}`);

        logger.info('Disabling foreign key checks...');
        await pool.query('SET FOREIGN_KEY_CHECKS=0');
        logger.info('✅ Foreign key checks disabled');

        // Step 3: Run migration files
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            // Skip rollback/down files during standard migrate runs
            .filter(file => !file.toLowerCase().includes('_down_'))
            .sort();

        logger.info(`Found ${files.length} migration files`);

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            logger.info(`Running migration: ${file}`);

            // Split by semicolon to execute multiple statements
            const statements = sql
                .split(';')
                .map(stmt => stmt
                    .split('\n')
                    .map(line => {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('--')) {
                            return '';
                        }
                        const commentIndex = line.indexOf('--');
                        return commentIndex === -1 ? line : line.slice(0, commentIndex);
                    })
                    .join('\n')
                    .trim()
                )
                .filter(stmt => stmt.length > 0);

            for (const statement of statements) {
                try {
                    await pool.query(statement);
                } catch (error) {
                    // Ignore idempotent schema errors so rerunning migrations is safe
                    const isDuplicateColumn = error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column name');
                    const isDuplicateKey = error.code === 'ER_DUP_KEYNAME' || error.message.includes('Duplicate key name');
                    const isExistsError = error.message.includes('exists');

                    if (!isExistsError && !isDuplicateColumn && !isDuplicateKey) {
                        logger.error(`Error in statement: ${statement.substring(0, 100)}...`);
                        throw error;
                    }
                }
            }

            logger.info(`✅ Completed: ${file}`);
        }

        await pool.query('SET FOREIGN_KEY_CHECKS=1');
        logger.info('✅ Foreign key checks re-enabled');

        logger.info('All migrations completed successfully!');

    } catch (err) {
        console.error("MYSQL ERROR:", err.message);
        console.error("FULL ERROR:", err);   // view full details
        throw err; // stop execution
    } finally {
        await pool.end();
    }
}

// Run migrations
runMigrations()
    .then(() => {
        console.log('✅ Database migrations completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Migration error:', error.message);
        process.exit(1);
    });
