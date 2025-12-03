import pool from '../config/database.js';

async function createRefreshTokensTable() {
    try {
        console.log('Creating refresh_tokens table...');

        const sql = `
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT NOT NULL,
                token CHAR(64) NOT NULL,
                issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                revoked BOOLEAN DEFAULT FALSE,
                revoked_at TIMESTAMP NULL,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_token (token)
            )
        `;

        await pool.query(sql);
        console.log('✅ Table created');

        await pool.query('CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id)');
        console.log('✅ Index idx_refresh_user created');

        await pool.query('CREATE INDEX IF NOT EXISTS idx_refresh_token ON refresh_tokens(token, revoked)');
        console.log('✅ Index idx_refresh_token created');

        // Verify table exists
        const [tables] = await pool.query("SHOW TABLES LIKE 'refresh_tokens'");
        console.log('Table exists:', tables.length > 0);

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

createRefreshTokensTable();
