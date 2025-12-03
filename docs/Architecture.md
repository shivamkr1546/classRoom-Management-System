# System Architecture

## Overview

The Classroom Management System is built on a modern REST API architecture with a layered design pattern, emphasizing security, scalability, and maintainability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                  (Frontend / Mobile / External)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Rate Limiter │  │     CORS     │  │     JWT      │          │
│  │  (300/min)   │  │   Middleware │  │  Auth Guard  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      REQUEST LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Express    │  │ Body Parser  │  │   Winston    │          │
│  │   Router     │  │   Middleware │  │   Logger     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VALIDATION LAYER                             │
│               Joi Schema Validation (All Endpoints)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                         │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │Auth         │  │Resource     │  │Scheduling   │            │
│  │Controller   │  │Controllers  │  │Engine       │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │Enrollment   │  │Attendance   │  │Analytics    │            │
│  │Manager      │  │Tracker      │  │Engine       │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                          │
│                     MySQL Connection Pool                        │
│                    (Query Utils + Transactions)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                            │
│                         MySQL 8.0                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │Users │ │Rooms │ │Courses│ │Students│ │Schedules│ │Attendance│ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│  ┌──────┐ ┌──────┐ ┌──────┐                                    │
│  │Enroll│ │Refresh│ │Instructor│                               │
│  │ments │ │Tokens │ │Courses   │                               │
│  └──────┘ └──────┘ └──────┘                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. API Gateway Layer
- **Express Server**: Handles HTTP requests and routing
- **CORS Middleware**: Cross-origin resource sharing for frontend
- **Rate Limiters**: 
  - Global: 300 req/min per IP
  - Login: 5 attempts/15min with progressive slowdown
  - Bulk operations: 10 req/min

### 2. Authentication & Authorization
- **JWT Access Tokens**: Short-lived (15 min), stateless
- **Refresh Tokens**: Long-lived (30 days), database-backed, revocable
- **Role-Based Access Control**: Admin, Coordinator, Instructor
- **SHA256 Token Hashing**: Secure storage in database

### 3. Business Logic Controllers

#### Phase 1: Foundation
- `auth.controller.js` - Authentication, token management
- `errorHandler.js` - Global error handling middleware
- `authMiddleware.js` - JWT verification and authorization

#### Phase 2: Resource Management
- `users.controller.js` - User CRUD operations
- `rooms.controller.js` - Room inventory management
- `courses.controller.js` - Course catalog + instructor assignments
- `students.controller.js` - Student records + bulk import

#### Phase 3: Scheduling
- `schedules.controller.js` - Schedule CRUD with conflict detection
- Conflict detection algorithm for room and instructor availability

#### Phase 4: Attendance & Analytics
- `enrollments.controller.js` - Student-course enrollments
- `attendance.controller.js` - Attendance tracking (present/absent/late/excused)
- `analytics.controller.js` - Room utilization, instructor workload, attendance stats

### 4. Data Access Layer
- **Connection Pool**: Managed MySQL connections
- **Query Utilities**: Parameterized queries, SQL injection prevention
- **Transaction Support**: Bulk operations use ACID transactions

### 5. Database Schema
See [Database.md](./Database.md) for full schema documentation.

**Key Features:**
- Foreign key constraints for data integrity
- Soft deletes (`deleted_at` timestamps)
- Audit trail (`created_by`, `updated_by`, `deleted_by`)
- Performance indexes on conflict detection queries

## Request Flow Example

**Creating a Schedule:**

```
1. Client → POST /api/schedules
   ↓
2. Rate Limiter → Check request count
   ↓
3. CORS → Verify origin
   ↓
4. JWT Middleware → Verify access token, extract user
   ↓
5. Authorization → Check role (admin/coordinator only)
   ↓
6. Joi Validation → Validate request body schema
   ↓
7. Schedule Controller:
   a. Check instructor is assigned to course
   b. Check room capacity ≥ course required capacity
   c. Detect room conflicts (time overlap)
   d. Detect instructor conflicts (time overlap)
   e. If conflicts found → 409 Conflict
   f. If validation passes → INSERT schedule
   ↓
8. Response → 201 Created with schedule data
```

## Security Layers

### Layer 1: Network Security
- CORS configuration
- HTTPS (in production)
- Rate limiting

### Layer 2: Authentication
- JWT signature verification
- Token expiration checking
- Refresh token revocation

### Layer 3: Authorization
- Role-based access control
- Resource ownership checks (instructors can only modify their courses)
- Admin-only operations (user management, token revocation)

### Layer 4: Input Validation
- Joi schema validation on all inputs
- Parameterized SQL queries (no injection)
- Enum validation (e.g., attendance status)

### Layer 5: Audit Trail
- All modifications track `created_by`, `updated_by`
- Deletions are soft (reversible)
- Refresh token IP and User-Agent tracking

## Scalability Considerations

### Current Architecture (Staging-Ready)
- Single MySQL instance
- In-memory rate limiting (per server)
- File-based logging

### Production Recommendations
- **Database**: MySQL read replicas for analytics queries
- **Rate Limiting**: Redis-backed distributed rate limiting
- **Logging**: Centralized log aggregation (ELK, CloudWatch)
- **Caching**: Redis for frequently accessed data
- **Load Balancing**: Nginx reverse proxy with multiple API instances

## Performance Optimizations

### Database Indexes
```sql
-- Conflict detection indexes
CREATE INDEX idx_schedule_room_date ON schedules(room_id, date, start_time, end_time);
CREATE INDEX idx_schedule_instructor_date ON schedules(instructor_id, date, start_time, end_time);

-- Enrollment lookups
CREATE INDEX idx_enrollment_course_student ON enrollments(course_id, student_id, status);

-- Attendance queries
CREATE INDEX idx_attendance_student_date ON attendance(student_id, marked_at);
```

### Query Optimization
- Pagination on all list endpoints (default 10, max 100)
- Soft delete filtering in indexes
- Connection pooling (default: 10 connections)

## Error Handling Strategy

**Centralized Error Handler:**
- Maps database errors to HTTP status codes
- Structured error responses with `error`, `message`, `details`
- Winston logging to console + files
- Different error formats for dev vs. production

**Error Categories:**
- **400 ValidationError**: Invalid input data
- **401 Unauthorized**: Invalid credentials or token
- **403 Forbidden**: Insufficient permissions
- **404 NotFound**: Resource doesn't exist
- **409 Conflict**: Schedule conflicts, duplicate entries
- **500 InternalServerError**: Unexpected server errors

## Technology Decisions

### Why Express?
- Lightweight, flexible
- Large ecosystem of middleware
- Industry standard for Node.js APIs

### Why MySQL?
- ACID compliance for schedule conflicts
- Strong foreign key support
- Excellent tooling and maturity
- Easy to scale with read replicas

### Why JWT?
- Stateless authentication
- Easy to integrate with frontend
- Industry standard with refresh token pattern

### Why Joi?
- Declarative validation schemas
- Comprehensive validation rules
- Easy to maintain

### Why Winston?
- Structured logging
- Multiple transports (console, file, external)
- Log levels and filtering

## Monitoring Points

**Current (Basic):**
- `/health` endpoint
- winston logs (console + file)

**Recommended (Production):**
- Request count metrics
- Response time percentiles (p50, p95, p99)
- Error rate tracking
- Database connection pool saturation
- Active sessions count

---

**Next:** See [Deployment.md](./Deployment.md) for deployment architecture and [Monitoring.md](./Monitoring.md) for observability setup.
