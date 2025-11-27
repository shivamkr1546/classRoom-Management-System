import Joi from 'joi';

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Where to validate: 'body', 'params', or 'query'
 */
export function validate(schema, source = 'body') {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: 'ValidationError',
                message: 'Request validation failed',
                details: errors
            });
        }

        // Replace with validated value
        req[source] = value;
        next();
    };
}

// Common validation schemas
export const schemas = {
    // Auth schemas
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
    }),

    register: Joi.object({
        name: Joi.string().min(2).max(150).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        role: Joi.string().valid('admin', 'coordinator', 'instructor').required()
    }),

    // Room schemas
    room: Joi.object({
        code: Joi.string().max(50).required(),
        name: Joi.string().max(150).required(),
        type: Joi.string().valid('classroom', 'lab', 'seminar', 'auditorium').default('classroom'),
        capacity: Joi.number().integer().min(1).required(),
        location: Joi.string().max(255).optional()
    }),

    // Course schemas
    course: Joi.object({
        code: Joi.string().max(50).required(),
        name: Joi.string().max(150).required(),
        required_capacity: Joi.number().integer().min(0).default(0)
    }),

    // Student schemas
    student: Joi.object({
        roll_no: Joi.string().max(50).required(),
        name: Joi.string().max(150).required(),
        email: Joi.string().email().optional(),
        class_label: Joi.string().max(100).optional()
    }),

    // Schedule schemas
    schedule: Joi.object({
        room_id: Joi.number().integer().required(),
        course_id: Joi.number().integer().required(),
        instructor_id: Joi.number().integer().required(),
        date: Joi.date().required(),
        start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).required(),
        end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).required(),
        created_by: Joi.number().integer().optional()
    }),

    // Attendance schemas
    attendanceMark: Joi.object({
        date: Joi.date().required(),
        class_label: Joi.string().max(100).optional(),
        marks: Joi.array().items(
            Joi.object({
                student_id: Joi.number().integer().required(),
                status: Joi.string().valid('present', 'absent').required()
            })
        ).required()
    })
};
