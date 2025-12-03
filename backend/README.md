# Classroom Scheduling Backend - Phase 2 Complete! 🎉

## Project Status

**Phase 1 (Backend Foundation)** ✅ COMPLETE  
**Phase 2 (CRUD API Layer)** ✅ COMPLETE  
**Phase 3 (Scheduling Engine)** ✅ COMPLETE


## What We've Built

### Phase 1 (Backend Foundation) ✅

Phase 1 established the core infrastructure with all foundational components.

#### ✅ Infrastructure Components

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

### Phase 2 (CRUD API Layer) ✅

Phase 2 adds comprehensive resource management with 24 new endpoints.

#### ✅ Features Implemented

1. **User Management APIs** (6 endpoints)
   - List, create, read, update, delete users
   - Password change endpoint (self-service + admin reset)
   - Search by name/email, filter by role
   - Soft delete with audit trail

2. **Room Management APIs** (5 endpoints)
   - List, create, read, update, delete rooms
   - Search by code/name, filter by type
   - Conflict prevention (cannot delete scheduled rooms)
   - Soft delete support

3. **Course Management APIs** (7 endpoints)
   - List, create, read, update, delete courses
   - Assign/unassign instructors to courses
   - Instructor ownership validation
   - Search by code/name
   - Soft delete with schedule conflict checking

4. **Student Management APIs** (6 endpoints)
   - List, create, read, update, delete students
   - **Bulk import** with transactional integrity
   - Search by roll_no/name, filter by class_label
   - Line-level error reporting for bulk operations
   - Soft delete support

#### ✅ Advanced Features

- **Soft Deletes**: All resources use `deleted_at` timestamp for reversible deletion
- **Audit Trail**: `created_by`, `updated_by`, `deleted_by` columns track all changes
- **Ownership Checks**: Instructors can only update courses they teach
- **Conflict Prevention**: Cannot delete rooms/courses with future schedules (409 Conflict)
- **Bulk Operations**: Transactional student import (all-or-nothing)
- **Pagination**: All list endpoints support page/limit parameters
- **Search & Filter**: Flexible querying on all resources

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

## 📖 API Documentation

### Authentication Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | Public | User login, returns JWT token |
| `/api/auth/register` | POST | Admin | Create new user account |

### User Management Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/users` | GET | Admin | List all users (pagination, filter by role, search) |
| `/api/users/:id` | GET | Admin/Self | Get user details |
| `/api/users` | POST | Admin | Create new user |
| `/api/users/:id` | PUT | Admin | Update user information |
| `/api/users/:id` | DELETE | Admin | Soft delete user |
| `/api/users/:id/password` | PATCH | Admin/Self | Change password (self requires current password) |

### Room Management Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/rooms` | GET | Authenticated | List all rooms (pagination, filter by type, search) |
| `/api/rooms/:id` | GET | Authenticated | Get room details |
| `/api/rooms` | POST | Admin/Coordinator | Create new room |
| `/api/rooms/:id` | PUT | Admin/Coordinator | Update room information |
| `/api/rooms/:id` | DELETE | Admin | Soft delete room (prevents if scheduled) |

### Course Management Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/courses` | GET | Authenticated | List all courses (pagination, search) |
| `/api/courses/:id` | GET | Authenticated | Get course details with assigned instructors |
| `/api/courses` | POST | Admin/Coordinator | Create new course |
| `/api/courses/:id` | PUT | Admin/Coordinator/Instructor* | Update course (* instructors: own courses only) |
| `/api/courses/:id` | DELETE | Admin | Soft delete course (prevents if scheduled) |
| `/api/courses/:id/instructors/:instructorId` | POST | Admin/Coordinator | Assign instructor to course |
| `/api/courses/:id/instructors/:instructorId` | DELETE | Admin/Coordinator | Unassign instructor from course |

### Student Management Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/students` | GET | Authenticated | List all students (pagination, filter by class, search) |
| `/api/students/:id` | GET | Authenticated | Get student details |
| `/api/students` | POST | Admin/Coordinator | Create new student |
| `/api/students/bulk` | POST | Admin/Coordinator | Bulk import students (transactional) |
| `/api/students/:id` | PUT | Admin/Coordinator | Update student information |
| `/api/students/:id` | DELETE | Admin | Soft delete student |

### Query Parameters

**Pagination** (all list endpoints):
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

**Filtering & Search**:
- **Users**: `role`, `search` (name/email)
- **Rooms**: `type`, `search` (code/name)
- **Courses**: `search` (code/name)
- **Students**: `class_label`, `search` (roll_no/name)
- **Schedules**: `room_id`, `course_id`, `instructor_id`, `status`, `start_date`, `end_date`

---

### Phase 3 (Scheduling Engine) ✅

Phase 3 adds intelligent scheduling with conflict detection and validation.

#### ✅ Features Implemented

1. **Schedule Management APIs** (6 endpoints)
   - List, create, read, update, cancel schedules
   - **Bulk schedule creation** with transactional integrity
   - Date range filtering
   - Filter by room, course, instructor, status
   - Pagination support

2. **Conflict Detection**
   - **Room conflicts**: Prevents double-booking same room at overlapping times
   - **Instructor conflicts**: Prevents scheduling same instructor at overlapping times
   - Strict time overlap logic (touching boundaries OK: 09:00-10:00 + 10:00-11:00 = no conflict)
   
3. **Validation Rules** (All Hard Blockers)
   - **Room capacity validation**: Room capacity must >= course `required_capacity`
   - **Instructor assignment**: Instructor must be assigned to the course
   - **Time logic**: End time must be after start time
   - All validation failures return 409 Conflict with detailed errors

4. **Authorization**
   - **Create/Update/Delete**: Admin and Coordinator only
   - **List/Read**: All authenticated users
   - Instructors have read-only access

#### ✅ Advanced Features

- **Strict Validation**: No warnings - all validation errors block schedule creation
- **Touching Boundaries**: Adjacent time slots don't conflict (e.g., 10:00-11:00 and 11:00-12:00)
- **Transactional Bulk Import**: All-or-nothing schedule creation
- **Detailed Conflict Reporting**: Returns full details of conflicting schedules
- **Audit Trail**: Tracks `created_by` for all schedules
- **Status Management**: Uses `status='cancelled'` for soft deletion

---

## 📖 API Documentation

### Authentication Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | Public | User login, returns JWT token |
| `/api/auth/register` | POST | Admin | Create new user account |

### User Management Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/users` | GET | Admin | List all users (pagination, filter by role, search) |
| `/api/users/:id` | GET | Admin/Self | Get user details |
| `/api/users` | POST | Admin | Create new user |
| `/api/users/:id` | PUT | Admin | Update user information |
| `/api/users/:id` | DELETE | Admin | Soft delete user |
| `/api/users/:id/password` | PATCH | Admin/Self | Change password (self requires current password) |

### Room Management Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/rooms` | GET | Authenticated | List all rooms (pagination, filter by type, search) |
| `/api/rooms/:id` | GET | Authenticated | Get room details |
| `/api/rooms` | POST | Admin/Coordinator | Create new room |
| `/api/rooms/:id` | PUT | Admin/Coordinator | Update room information |
| `/api/rooms/:id` | DELETE | Admin | Soft delete room (prevents if scheduled) |

### Course Management Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/courses` | GET | Authenticated | List all courses (pagination, search) |
| `/api/courses/:id` | GET | Authenticated | Get course details with assigned instructors |
| `/api/courses` | POST | Admin/Coordinator | Create new course |
| `/api/courses/:id` | PUT | Admin/Coordinator/Instructor* | Update course (* instructors: own courses only) |
| `/api/courses/:id` | DELETE | Admin | Soft delete course (prevents if scheduled) |
| `/api/courses/:id/instructors/:instructorId` | POST | Admin/Coordinator | Assign instructor to course |
| `/api/courses/:id/instructors/:instructorId` | DELETE | Admin/Coordinator | Unassign instructor from course |

### Student Management Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/students` | GET | Authenticated | List all students (pagination, filter by class, search) |
| `/api/students/:id` | GET | Authenticated | Get student details |
| `/api/students` | POST | Admin/Coordinator | Create new student |
| `/api/students/bulk` | POST | Admin/Coordinator | Bulk import students (transactional) |
| `/api/students/:id` | PUT | Admin/Coordinator | Update student information |
| `/api/students/:id` | DELETE | Admin | Soft delete student |

### Schedule Management Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/schedules` | GET | Authenticated | List all schedules (pagination, filters) |
| `/api/schedules/:id` | GET | Authenticated | Get schedule details |
| `/api/schedules` | POST | Admin/Coordinator | Create new schedule (with conflict detection) |
| `/api/schedules/bulk` | POST | Admin/Coordinator | Bulk create schedules (transactional) |
| `/api/schedules/:id` | PUT | Admin/Coordinator | Update schedule (re-validates conflicts) |
| `/api/schedules/:id` | DELETE | Admin/Coordinator | Cancel schedule (sets status='cancelled') |

### Query Parameters

**Pagination** (all list endpoints):
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

**Filtering & Search**:
- **Users**: `role`, `search` (name/email)
- **Rooms**: `type`, `search` (code/name)
- **Courses**: `search` (code/name)
- **Students**: `class_label`, `search` (roll_no/name)
- **Schedules**: `room_id`, `course_id`, `instructor_id`, `status`, `start_date`, `end_date`

---

## Next Steps (Phase 4)

Phase 4 will add Attendance & Analytics:
- Schedule creation with conflict detection
- Time overlap validation
- Room capacity checks
- Instructor availability validation
- Real-time conflict reporting

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
