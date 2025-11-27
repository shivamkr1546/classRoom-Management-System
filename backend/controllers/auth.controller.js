import { query } from '../utils/db.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import { sanitizeUser } from '../utils/sanitize.js';
import { sendSuccess, sendError } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Register new user (admin only)
 * POST /auth/register
 */
export async function register(req, res, next) {
    try {
        const { name, email, password, role } = req.body;

        // Hash password
        const password_hash = await hashPassword(password);

        // Insert user
        const result = await query(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email, password_hash, role]
        );

        // Get created user (without password)
        const user = await query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        logger.info(`New user registered: ${email} (${role})`);

        return sendSuccess(res, 201, sanitizeUser(user[0]), 'User registered successfully');
    } catch (error) {
        next(error);
    }
}

/**
 * Login user
 * POST /auth/login
 */
export async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        // Find user by email
        const users = await query(
            'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return sendError(res, 401, 'Unauthorized', 'Invalid email or password');
        }

        const user = users[0];

        // Compare password
        const isMatch = await comparePassword(password, user.password_hash);

        if (!isMatch) {
            return sendError(res, 401, 'Unauthorized', 'Invalid email or password');
        }

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        logger.info(`User logged in: ${email}`);

        return sendSuccess(res, 200, {
            token,
            user: sanitizeUser(user)
        }, 'Login successful');
    } catch (error) {
        next(error);
    }
}
