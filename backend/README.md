# Classroom Scheduling Backend - Phase 1 Complete! 🎉

## What We've Built

Phase 1 (Backend Foundation) is now complete with all core infrastructure in place.

### ✅ Infrastructure Components

1. **Database Layer**
   - MySQL connection pool (`config/database.js`)
   - Complete schema with 7 tables (users, rooms, courses, students, schedules, attendance)
   - Foreign keys and constraints
   - Performance indexes for conflict detection
   - Migration scripts ready to run

2. **Authentication & Security**
   - JWT token generation/verification (`utils/auth.js`)
   - bcrypt password hashing (cost 12)
   - Token expiry: 24 hours
   - Auth middleware (`middleware/authMiddleware.js`)
   - Role-based authorization (admin, coordinator, instructor)

3. **Validation**
   - Joi validation middleware (`middleware/validation.js`)
   - Pre-built schemas for all entities (auth, rooms, courses, students, schedules, attendance)

4. **Error Handling**
   - Global error handler (`middleware/errorHandler.js`)
   - Structured error responses
   - Database error mapping (duplicates, foreign keys)
   - Winston logging to console and files

5. **API Endpoints (Auth)**
   - POST `/api/auth/login` - User login (returns JWT)
   - POST `/api/auth/register` - Create user (admin only)

6. **Server Setup**
   - Express app with CORS
   - Request logging
   - Health check endpoint `/health`
   - Environment configuration

---

## 🚀 Getting Started

### Prerequisites
- Node.js (LTS version)
- MySQL server running on localhost
- Empty password for root user (or update `.env`)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Edit `.env` file if needed (default uses localhost MySQL with empty password)

3. **Run database migrations:**
   ```bash
   npm run migrate
   ```
   This will create the database, tables, and insert seed data.

4. **Start the server:**
   ```bash
   npm run dev
   ```
   Server will start on `http://localhost:5000`

---

## 🧪 Testing

### Test Health Check
```bash
curl http://localhost:5000/health
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@classroom.com",
    "password": "admin123"
  }'
```

You should receive a JWT token in the response!

### Test Register (requires admin token)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "New User",
    "email": "newuser@classroom.com",
    "password": "password123",
    "role": "instructor"
  }'
```

---

## Default Users (from seed data)

| Email | Password | Role |
|-------|----------|------|
| admin@classroom.com | admin123 | admin |
| john@classroom.com | admin123 | instructor |
| jane@classroom.com | admin123 | coordinator |

---

## Project Structure

```
backend/
├── config/
│   └── database.js          # MySQL connection pool
├── controllers/
│   └── auth.controller.js   # Auth logic
├── middleware/
│   ├── authMiddleware.js    # JWT auth & authorization
│   ├── errorHandler.js      # Global error handling
│   └── validation.js        # Joi validation schemas
├── migrations/
│   ├── 001_create_tables.sql
│   └── 002_seed_data.sql
├── routes/
│   └── auth.routes.js       # Auth endpoints
├── scripts/
│   └── migrate.js           # Migration runner
├── utils/
│   ├── auth.js              # JWT & bcrypt utilities
│   └── logger.js            # Winston logger
├── logs/                    # Log files
├── .env                     # Environment variables
├── .env.example             # Env template
├── server.js                # Express app entry
└── package.json
```

---

## Next Steps (Phase 2)

Phase 2 will build the CRUD API layer:
- User Management APIs
- Room Management APIs  
- Course Management APIs
- Student Management APIs

All with proper validation, error handling, and authorization!

---

## Troubleshooting

### Database Connection Failed
- Ensure MySQL is running
- Check `.env` credentials
- Verify database exists: `CREATE DATABASE classroom_db;`

### Migration Errors
- Drop existing database: `DROP DATABASE classroom_db;`
- Run migrations again: `npm run migrate`

### Token Errors
- Check `JWT_SECRET` in `.env`
- Ensure token is sent as `Bearer TOKEN` in Authorization header
