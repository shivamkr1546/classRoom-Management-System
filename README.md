# Classroom Scheduling & Resource Management System

A full-stack classroom scheduling application with conflict-free scheduling, attendance tracking, and utilization analytics.

## 🚀 Project Status

**Phase 1: Backend Foundation** ✅ COMPLETE
- Express.js REST API
- MySQL database with optimized schema
- JWT authentication with role-based authorization
- Comprehensive validation (Joi)
- Production-ready error handling
- Concurrency-safe configuration (READ COMMITTED isolation)

## 📁 Project Structure

```
Classroom/
├── backend/              # Node.js/Express API server
│   ├── config/          # Database configuration
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth, validation, error handling
│   ├── migrations/      # Database SQL scripts
│   ├── routes/          # API endpoints
│   ├── scripts/         # Migration runner
│   ├── utils/           # Helper functions
│   └── server.js        # Entry point
└── frontend/            # React SPA (coming in Phase 5)
```

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL
- **Authentication:** JWT (jsonwebtoken) + bcrypt
- **Validation:** Joi
- **Logging:** Winston

### Frontend (Planned)
- **Framework:** React + Vite
- **Styling:** TailwindCSS
- **HTTP Client:** Axios
- **Charts:** Recharts
- **Routing:** React Router

## 📚 Features

### Current (Phase 1)
- ✅ User authentication (login/register)
- ✅ Role-based authorization (admin, coordinator, instructor)
- ✅ Database schema with foreign keys and constraints
- ✅ Conflict detection indexes for scheduling
- ✅ Seed data for testing

### Planned
- 🔄 **Phase 2:** CRUD APIs (Users, Rooms, Courses, Students)
- 🔄 **Phase 3:** Scheduling Engine (conflict detection, capacity validation)
- 🔄 **Phase 4:** Attendance & Analytics APIs
- 🔄 **Phase 5:** React Frontend Setup
- 🔄 **Phase 6-8:** Frontend UI implementation
- 🔄 **Phase 9:** Integration & QA

## 🚀 Getting Started

### Prerequisites
- Node.js (LTS version)
- MySQL server (v5.7+)
- npm or yarn

### Backend Setup

1. **Navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Update database credentials if needed

4. **Run migrations:**
   ```bash
   npm run migrate
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

Server will run on `http://localhost:5000`

### Test Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@classroom.com | admin123 | admin |
| john@classroom.com | admin123 | instructor |
| jane@classroom.com | admin123 | coordinator |

## 📖 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create user (admin only)

### Test Endpoints (Development)
- `GET /api/test/auth` - Verify JWT authentication
- `GET /api/test/db` - Test database connection
- `GET /health` - Health check

See [backend/README.md](backend/README.md) for detailed API documentation.

## 🧪 Testing

```bash
# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@classroom.com", "password": "admin123"}'
```

## 📝 Documentation

- [Backend README](backend/README.md) - Setup and API guide
- [Phase 1 Fixes](backend/PHASE1_FIXES.md) - Critical improvements
- [Implementation Plan](.gemini/antigravity/brain/9a7e65db-9c5a-4e8d-97bb-7f8262412cbf/implementation_plan.md) - Full roadmap

## 🏆 Key Achievements

- ✅ Production-grade backend architecture
- ✅ Conflict-safe database configuration
- ✅ Comprehensive error handling
- ✅ Security best practices (bcrypt cost 12, JWT expiry)
- ✅ DRY utilities (query wrapper, pagination, sanitization)
- ✅ Seed data for immediate testing

## 📄 License

MIT

## 👥 Contributors

Built following SRS specifications for both frontend and backend.

---

**Current Phase:** Phase 1 Complete ✅  
**Next Phase:** Phase 2 - CRUD API Layer
