import pool from '../config/database.js';

/**
 * Centralized database query wrapper
 * Makes testing easier and provides consistent error handling
 */
export async function query(sql, params = []) {
    try {
        const [rows] = await pool.query(sql, params);
        return rows;
    } catch (error) {
        // Add query context to error for better debugging
        error.sql = sql;
        error.params = params;
        throw error;
    }
}

/**
 * Execute a query and return the first row
 * Useful for SELECT ... WHERE id = ?
 */
export async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute a transactional operation
 * Automatically handles commit/rollback
 */
export async function transaction(callback) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Pagination helper
 * Converts page and limit to SQL offset and limit
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {object} - { limit, offset, page }
 */
export function paginate(page = 1, limit = 10) {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;

    return {
        limit: limitNum,
        offset: offset,
        page: pageNum
    };
}

/**
 * Build SQL ORDER BY clause safely
 * Prevents SQL injection on sort fields
 * @param {string} sortField - Field to sort by
 * @param {string} sortOrder - 'asc' or 'desc'
 * @param {array} allowedFields - Whitelist of sortable fields
 * @returns {string} - SQL ORDER BY clause
 */
export function buildOrderBy(sortField, sortOrder = 'asc', allowedFields = []) {
    // Validate sort field against whitelist
    if (!allowedFields.includes(sortField)) {
        return ''; // Return empty if field not in whitelist
    }

    // Validate sort order
    const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    return `ORDER BY ${sortField} ${order}`;
}

/**
 * Build pagination metadata for API responses
 * @param {number} totalCount - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} - Pagination metadata
 */
export function buildPaginationMeta(totalCount, page, limit) {
    const totalPages = Math.ceil(totalCount / limit);

    return {
        total: totalCount,
        page: page,
        limit: limit,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    };
}

export default {
    query,
    queryOne,
    transaction,
    paginate,
    buildOrderBy,
    buildPaginationMeta
};
