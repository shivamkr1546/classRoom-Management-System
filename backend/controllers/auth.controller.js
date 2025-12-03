import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../utils/db.js';
import { hashPassword, comparePassword } from '../utils/auth.js';
import { sanitizeUser } from '../utils/sanitize.js';
import { sendSuccess, sendError } from '../utils/response.js';
import logger from '../utils/logger.js';

// Token configuration
const ACCESS_TOKEN_EXPIRES = '15m'; // Short-lived for security
const REFRESH_TOKEN_EXPIRES_DAYS = 30; // Long-lived for convenience
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

/**
 * Generate short-lived access token
 */
function generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

/**
 * Generate strong random refresh token (96 hex chars)
 */
function generateRefreshToken() {
    return crypto.randomBytes(48).toString('hex');
}

/**
 * Save refresh token to database (hashed for security)
 */
async function saveRefreshToken(userId, token, ip = null, ua = null) {
    // Hash token before storing (prevents token theft from DB)
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await query(
        'INSERT INTO refresh_tokens (user_id, token, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [userId, hash, ip, ua]
    );

    return result.insertId;
}

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
 * Get current user profile
 * GET /auth/me
 */
export async function getCurrentUser(req, res, next) {
    try {
        // User is already authenticated via middleware, req.user is populated
        const userId = req.user.id;

        const users = await query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ? AND deleted_at IS NULL',
            [userId]
        );

        if (users.length === 0) {
            return sendError(res, 404, 'NotFound', 'User not found');
        }

        return sendSuccess(res, 200, sanitizeUser(users[0]), 'User retrieved successfully');
    } catch (error) {
        next(error);
    }
}


/**
 * Login user - returns access token + refresh token
 * POST /auth/login
 */
export async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        // Find user by email
        const users = await query(
            'SELECT id, name, email, password_hash, role FROM users WHERE email = ? AND deleted_at IS NULL',
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

        // Generate tokens
        const accessToken = generateAccessToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        const refreshToken = generateRefreshToken();

        // Save refresh token to database
        await saveRefreshToken(
            user.id,
            refreshToken,
            req.ip,
            req.get('User-Agent')
        );

        logger.info(`User logged in: ${email}`);

        return sendSuccess(res, 200, {
            accessToken,
            refreshToken,
            expiresIn: ACCESS_TOKEN_EXPIRES,
            token: accessToken, // Legacy field for backward compatibility with old test scripts
            user: sanitizeUser(user)
        }, 'Login successful');
    } catch (error) {
        next(error);
    }
}

/**
 * Refresh access token using refresh token
 * POST /auth/refresh
 */
export async function refresh(req, res, next) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return sendError(res, 400, 'ValidationError', 'Refresh token is required');
        }

        // Hash token to match DB
        const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        // Find non-revoked refresh token
        const tokens = await query(
            'SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0',
            [hash]
        );

        if (tokens.length === 0) {
            return sendError(res, 401, 'Unauthorized', 'Invalid or revoked refresh token');
        }

        const tokenRecord = tokens[0];

        // Check if token is expired (optional: implement based on issued_at + REFRESH_TOKEN_EXPIRES_DAYS)
        const expiryDate = new Date(tokenRecord.issued_at);
        expiryDate.setDate(expiryDate.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

        if (new Date() > expiryDate) {
            // Revoke expired token
            await query(
                'UPDATE refresh_tokens SET revoked = 1, revoked_at = NOW() WHERE id = ?',
                [tokenRecord.id]
            );
            return sendError(res, 401, 'Unauthorized', 'Refresh token has expired');
        }

        // Get user info
        const users = await query(
            'SELECT id, email, role FROM users WHERE id = ? AND deleted_at IS NULL',
            [tokenRecord.user_id]
        );

        if (users.length === 0) {
            return sendError(res, 401, 'Unauthorized', 'User not found');
        }

        const user = users[0];

        // Generate new access token
        const accessToken = generateAccessToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        logger.info(`Access token refreshed for user ID: ${user.id}`);

        // Optional: Implement token rotation (revoke old, issue new refresh token)
        // For now, we keep the same refresh token

        return sendSuccess(res, 200, {
            accessToken,
            expiresIn: ACCESS_TOKEN_EXPIRES
        }, 'Token refreshed successfully');
    } catch (error) {
        next(error);
    }
}

/**
 * Logout - revoke refresh token
 * POST /auth/logout
 */
export async function logout(req, res, next) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return sendError(res, 400, 'ValidationError', 'Refresh token is required');
        }

        // Hash token to match DB
        const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        // Revoke the token
        const result = await query(
            'UPDATE refresh_tokens SET revoked = 1, revoked_at = NOW() WHERE token = ?',
            [hash]
        );

        if (result.affectedRows === 0) {
            // Token not found - already revoked or invalid
            logger.warn('Logout attempted with invalid token');
        } else {
            logger.info('User logged out - refresh token revoked');
        }

        return sendSuccess(res, 200, { revoked: true }, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
}

/**
 * Revoke all refresh tokens for a user (admin only)
 * POST /auth/revoke-all/:userId
 */
export async function revokeAllTokens(req, res, next) {
    try {
        const { userId } = req.params;

        const result = await query(
            'UPDATE refresh_tokens SET revoked = 1, revoked_at = NOW() WHERE user_id = ? AND revoked = 0',
            [userId]
        );

        logger.info(`Revoked ${result.affectedRows} tokens for user ID: ${userId}`);

        return sendSuccess(res, 200, {
            revokedCount: result.affectedRows
        }, `All tokens revoked for user ${userId}`);
    } catch (error) {
        next(error);
    }
}
