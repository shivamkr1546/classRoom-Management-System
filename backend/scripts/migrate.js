import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run SQL migration files
 */
async function runMigrations() {
    const migrationsDir = path.join(__dirname, '../migrations');

    try {
        // Get all SQL files in migrations directory
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        logger.info(`Found ${files.length} migration files`);

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            logger.info(`Running migration: ${file}`);

            // Split by semicolon to execute multiple statements
            const statements = sql
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

            for (const statement of statements) {
                try {
                    await pool.query(statement);
                } catch (error) {
                    // Ignore "database exists" and "table exists" errors
                    if (!error.message.includes('exists')) {
                        throw error;
                    }
                }
            }

            logger.info(`✅ Completed: ${file}`);
        }

        logger.info('All migrations completed successfully!');

    } catch (error) {
        logger.error('Migration failed:', error);
        throw error;
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
