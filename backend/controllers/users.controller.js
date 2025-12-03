import { query, queryOne, paginate, buildOrderBy, buildPaginationMeta } from '../utils/db.js';
import { hashPassword, comparePassword } from '../utils/auth.js';
import { sanitizeUser, sanitizeUsers } from '../utils/sanitize.js';
import { sendSuccess, sendPaginatedResponse, sendError } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Get all users with pagination and filtering
 * GET /api/users?page=1&limit=10&role=instructor&search=john
 */
export async function getUsers(req, res, next) {
    try {
        const { page, limit, offset } = paginate(req.query.page, req.query.limit);
        const { role, search } = req.query;

        // Build WHERE clause
        const conditions = ['deleted_at IS NULL'];
        const params = [];

        if (role) {
            conditions.push('role = ?');
            params.push(role);
        }

        if (search) {
            conditions.push('(name LIKE ? OR email LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM users ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get paginated users
        const users = await query(
            `SELECT id, name, email, role, created_at, updated_at 
             FROM users 
             ${whereClause}
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const pagination = buildPaginationMeta(total, page, limit);

        return sendPaginatedResponse(res, sanitizeUsers(users), pagination);
    } catch (error) {
        next(error);
    }
}

/**
 * Get single user by ID
 * GET /api/users/:id
 */
export async function getUserById(req, res, next) {
    try {
        const { id } = req.params;

        // Admin can view anyone, others can only view themselves
        if (req.user.role !== 'admin' && parseInt(id) !== req.user.id) {
            return sendError(res, 403, 'Forbidden', 'You can only view your own profile');
        }

        const user = await queryOne(
            'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!user) {
            return sendError(res, 404, 'NotFound', 'User not found');
        }

        return sendSuccess(res, 200, sanitizeUser(user));
    } catch (error) {
        next(error);
    }
}

/**
 * Create new user (admin only)
 * POST /api/users
 */
export async function createUser(req, res, next) {
    try {
        const { name, email, password, role } = req.body;

        // Hash password
        const password_hash = await hashPassword(password);

        // Insert user
        const result = await query(
            'INSERT INTO users (name, email, password_hash, role, created_by) VALUES (?, ?, ?, ?, ?)',
            [name, email, password_hash, role, req.user.id]
        );

        // Get created user
        const user = await queryOne(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        logger.info(`User created: ${email} (${role}) by user ${req.user.id}`);

        return sendSuccess(res, 201, sanitizeUser(user), 'User created successfully');
    } catch (error) {
        // Handle duplicate email
        if (error.code === 'ER_DUP_ENTRY') {
            return sendError(res, 409, 'Conflict', 'Email already exists');
        }
        next(error);
    }
}

/**
 * Update user (admin only)
 * PUT /api/users/:id
 */
export async function updateUser(req, res, next) {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Check if user exists
        const existingUser = await queryOne(
            'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!existingUser) {
            return sendError(res, 404, 'NotFound', 'User not found');
        }

        // Build update query
        const fields = [];
        const values = [];

        if (updates.name) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.email) {
            fields.push('email = ?');
            values.push(updates.email);
        }
        if (updates.role) {
            fields.push('role = ?');
            values.push(updates.role);
        }

        // Add audit fields
        fields.push('updated_by = ?');
        values.push(req.user.id);

        // Execute update
        await query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            [...values, id]
        );

        // Get updated user
        const user = await queryOne(
            'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?',
            [id]
        );

        logger.info(`User updated: ${id} by user ${req.user.id}`);

        return sendSuccess(res, 200, sanitizeUser(user), 'User updated successfully');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return sendError(res, 409, 'Conflict', 'Email already exists');
        }
        next(error);
    }
}

/**
 * Delete user (soft delete, admin only)
 * DELETE /api/users/:id
 */
export async function deleteUser(req, res, next) {
    try {
        const { id } = req.params;

        // Check if user exists
        const user = await queryOne(
            'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!user) {
            return sendError(res, 404, 'NotFound', 'User not found');
        }

        // Prevent self-deletion
        if (parseInt(id) === req.user.id) {
            return sendError(res, 400, 'BadRequest', 'Cannot delete your own account');
        }

        // Soft delete
        await query(
            'UPDATE users SET deleted_at = NOW(), deleted_by = ? WHERE id = ?',
            [req.user.id, id]
        );

        logger.info(`User soft-deleted: ${id} by user ${req.user.id}`);

        return sendSuccess(res, 200, null, 'User deleted successfully');
    } catch (error) {
        next(error);
    }
}

/**
 * Change user password
 * PATCH /api/users/:id/password
 * Self: requires current password
 * Admin: can reset without current password
 */
export async function changePassword(req, res, next) {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        const isSelf = parseInt(id) === req.user.id;
        const isAdmin = req.user.role === 'admin';

        // Only self or admin can change password
        if (!isSelf && !isAdmin) {
            return sendError(res, 403, 'Forbidden', 'Insufficient permissions');
        }

        // Get user with password hash
        const user = await queryOne(
            'SELECT id, email, password_hash FROM users WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!user) {
            return sendError(res, 404, 'NotFound', 'User not found');
        }

        // If changing own password, verify current password
        if (isSelf) {
            const isMatch = await comparePassword(currentPassword, user.password_hash);
            if (!isMatch) {
                return sendError(res, 401, 'Unauthorized', 'Current password is incorrect');
            }
        }

        // Hash new password
        const password_hash = await hashPassword(newPassword);

        // Update password
        await query(
            'UPDATE users SET password_hash = ?, updated_by = ? WHERE id = ?',
            [password_hash, req.user.id, id]
        );

        logger.info(`Password changed for user ${id} by ${isSelf ? 'self' : `admin ${req.user.id}`}`);

        return sendSuccess(res, 200, null, 'Password changed successfully');
    } catch (error) {
        next(error);
    }
}
