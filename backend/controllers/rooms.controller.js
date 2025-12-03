import { query, queryOne, paginate, buildPaginationMeta } from '../utils/db.js';
import { sendSuccess, sendPaginatedResponse, sendError } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Get all rooms with pagination and filtering
 * GET /api/rooms?page=1&limit=10&type=lab&search=computer
 */
export async function getRooms(req, res, next) {
    try {
        const { page, limit, offset } = paginate(req.query.page, req.query.limit);
        const { type, search } = req.query;

        // Build WHERE clause
        const conditions = ['deleted_at IS NULL'];
        const params = [];

        if (type) {
            conditions.push('type = ?');
            params.push(type);
        }

        if (search) {
            conditions.push('(name LIKE ? OR code LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM rooms ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Get paginated rooms
        const rooms = await query(
            `SELECT id, code, name, type, capacity, location, created_at, updated_at 
             FROM rooms 
             ${whereClause}
             ORDER BY code ASC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const pagination = buildPaginationMeta(total, page, limit);

        return sendPaginatedResponse(res, rooms, pagination);
    } catch (error) {
        next(error);
    }
}

/**
 * Get single room by ID
 * GET /api/rooms/:id
 */
export async function getRoomById(req, res, next) {
    try {
        const { id } = req.params;

        const room = await queryOne(
            'SELECT id, code, name, type, capacity, location, created_at, updated_at FROM rooms WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!room) {
            return sendError(res, 404, 'NotFound', 'Room not found');
        }

        return sendSuccess(res, 200, room);
    } catch (error) {
        next(error);
    }
}

/**
 * Create new room (admin/coordinator)
 * POST /api/rooms
 */
export async function createRoom(req, res, next) {
    try {
        const { code, name, type, capacity, location } = req.body;

        const existingRoom = await queryOne(
            'SELECT id, deleted_at FROM rooms WHERE code = ? LIMIT 1',
            [code]
        );

        if (existingRoom) {
            if (existingRoom.deleted_at) {
                await query(
                    `UPDATE rooms
                     SET name = ?, type = ?, capacity = ?, location = ?, deleted_at = NULL, deleted_by = NULL,
                         updated_by = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [name, type || 'classroom', capacity, location || null, req.user.id, existingRoom.id]
                );

                const room = await queryOne(
                    'SELECT id, code, name, type, capacity, location, created_at, updated_at FROM rooms WHERE id = ?',
                    [existingRoom.id]
                );

                logger.info(`Room restored: ${code} by user ${req.user.id}`);

                return sendSuccess(res, 201, room, 'Room restored successfully');
            }

            return sendError(res, 409, 'Conflict', 'Room code already exists');
        }

        // Insert room
        const result = await query(
            'INSERT INTO rooms (code, name, type, capacity, location, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [code, name, type || 'classroom', capacity, location || null, req.user.id]
        );

        // Get created room
        const room = await queryOne(
            'SELECT id, code, name, type, capacity, location, created_at FROM rooms WHERE id = ?',
            [result.insertId]
        );

        logger.info(`Room created: ${code} by user ${req.user.id}`);

        return sendSuccess(res, 201, room, 'Room created successfully');
    } catch (error) {
        // Handle duplicate code
        if (error.code === 'ER_DUP_ENTRY') {
            return sendError(res, 409, 'Conflict', 'Room code already exists');
        }
        next(error);
    }
}

/**
 * Update room (admin/coordinator)
 * PUT /api/rooms/:id
 */
export async function updateRoom(req, res, next) {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Check if room exists
        const existingRoom = await queryOne(
            'SELECT id FROM rooms WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!existingRoom) {
            return sendError(res, 404, 'NotFound', 'Room not found');
        }

        // Build update query
        const fields = [];
        const values = [];

        if (updates.code) {
            fields.push('code = ?');
            values.push(updates.code);
        }
        if (updates.name) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.type) {
            fields.push('type = ?');
            values.push(updates.type);
        }
        if (updates.capacity !== undefined) {
            fields.push('capacity = ?');
            values.push(updates.capacity);
        }
        if (updates.location !== undefined) {
            fields.push('location = ?');
            values.push(updates.location);
        }

        // Add audit fields
        fields.push('updated_by = ?');
        values.push(req.user.id);

        // Execute update
        await query(
            `UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`,
            [...values, id]
        );

        // Get updated room
        const room = await queryOne(
            'SELECT id, code, name, type, capacity, location, created_at, updated_at FROM rooms WHERE id = ?',
            [id]
        );

        logger.info(`Room updated: ${id} by user ${req.user.id}`);

        return sendSuccess(res, 200, room, 'Room updated successfully');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return sendError(res, 409, 'Conflict', 'Room code already exists');
        }
        next(error);
    }
}

/**
 * Delete room (soft delete, admin only)
 * DELETE /api/rooms/:id
 * Prevents deletion if room has future schedules
 */
export async function deleteRoom(req, res, next) {
    try {
        const { id } = req.params;

        // Check if room exists
        const room = await queryOne(
            'SELECT id, code FROM rooms WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (!room) {
            return sendError(res, 404, 'NotFound', 'Room not found');
        }

        // Check for future schedules
        const schedules = await query(
            'SELECT COUNT(*) as count FROM schedules WHERE room_id = ? AND date >= CURDATE() AND status = ?',
            [id, 'confirmed']
        );

        if (schedules[0].count > 0) {
            return sendError(
                res,
                409,
                'Conflict',
                'Cannot delete room with future schedules',
                { futureSchedules: schedules[0].count }
            );
        }

        // Soft delete
        await query(
            'UPDATE rooms SET deleted_at = NOW(), deleted_by = ? WHERE id = ?',
            [req.user.id, id]
        );

        logger.info(`Room soft-deleted: ${room.code} (${id}) by user ${req.user.id}`);

        return sendSuccess(res, 200, null, 'Room deleted successfully');
    } catch (error) {
        next(error);
    }
}
