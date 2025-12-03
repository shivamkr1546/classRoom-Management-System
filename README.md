# Classroom Management System

A comprehensive backend system for educational institutions featuring intelligent scheduling, resource management, attendance tracking, and analytics.

[![Build Status](https://img.shields.io/badge/build-staging--ready-green)]()
[![Security](https://img.shields.io/badge/security-hardened-blue)]()
[![License](https://img.shields.io/badge/license-MIT-purple)]()

## 🎯 Current Status: Staging-Ready

All core features implemented and security-hardened. Ready for staging deployment and frontend integration.

**Quick Start:** [Get running in 5 minutes](./docs/QuickStart.md)

---

## ✨ Features

### Phase 1: Foundation ✅
- JWT authentication with refresh token support
- Role-based access control (Admin, Coordinator, Instructor)
- Rate limiting and brute-force protection
- Comprehensive input validation
- Audit trail for all operations

### Phase 2: Resource Management ✅
- **User Management** - CRUD operations with soft deletes
- **Room Inventory** - Classroom/Lab/Seminar room management
- **Course Catalog** - Courses with instructor assignments
- **Student Records** - Individual and bulk student import

### Phase 3: Intelligent Scheduling ✅
- **Conflict Detection** - Prevents double-booking of rooms and instructors
- **Capacity Validation** - Ensures rooms fit course requirements
- **Bulk Operations** - Create multiple schedules with transactional integrity
- **Flexible Filtering** - By date, room, course, instructor, status

### Phase 4: Attendance & Analytics ✅
- **Enrollment Management** - Student-course enrollments
- **Attendance Tracking** - Mark present/absent/late/excused
- **Room Utilization** - Analytics on room usage patterns
- **Instructor Workload** - Teaching hours and schedule analytics
- **Attendance Statistics** - Course and student attendance summaries

---

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone YOUR_REPO
cd Classroom/backend
npm install

# 2. Create .env (copy from .env.example)
# Set JWT_SECRET and JWT_REFRESH_SECRET

# 3. Setup database
npm run migrate

# 4. Start server
npm start

# 5. Test
curl http://localhost:5000/health
```

**Default login:** `admin@classroom.com` / `admin123`

👉 **Full guide:** [Quick Start Documentation](./docs/QuickStart.md)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Quick Start](./docs/QuickStart.md) | Get running in 5 minutes |
| [Architecture](./docs/Architecture.md) | System design and components |
| [Security](./docs/Security.md) | Authentication, rate limiting, token management |
| [Deployment](./docs/Deployment.md) | Docker, VPS, cloud deployment options |
| [Production Roadmap](./docs/ProductionRoadmap.md) | Path to full production readiness |
| [API Reference](./docs/APIReference.md) | Complete endpoint documentation |

---

## 🔒 Security Features

- ✅ **JWT Refresh Tokens** - Short-lived access tokens (15 min), long-lived refresh tokens (30 days)
- ✅ **Token Revocation** - Forced logout capability with database-backed token management
- ✅ **Rate Limiting** - 300 req/min global, 5 attempts/15min for login with progressive slowdown
- ✅ **Brute-Force Protection** - IP-based throttling on authentication endpoints
- ✅ **Input Validation** - Joi schemas on all endpoints with enum validation
- ✅ **SHA256 Token Hashing** - Secure token storage in database
- ✅ **Audit Trail** - Track who created, updated, or deleted every resource

---

## 🏗️ Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MySQL 8.0
- **Authentication:** JWT (access + refresh tokens)
- **Validation:** Joi
- **Logging:** Winston
- **Testing:** Custom integration test suites
- **CI/CD:** GitHub Actions
- **Deployment:** Docker + Docker Compose

---

## 📊 API Overview

35+ endpoints across 9 modules:

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | 4 | Login, register, refresh token, logout |
| **Users** | 6 | User CRUD, password management |
| **Rooms** | 5 | Room inventory management |
| **Courses** | 7 | Course catalog + instructor assignments |
| **Students** | 6 | Student records + bulk import |
| **Schedules** | 6 | Schedule CRUD with conflict detection |
| **Enrollments** | 5 | Student-course enrollment management |
| **Attendance** | 5 | Attendance tracking and history |
| **Analytics** | 4 | Room utilization, workload, attendance stats |

**Full API documentation:** [API Reference](./docs/APIReference.md)

---

## 🧪 Testing

```bash
# Run comprehensive test suites
node scripts/test-phase2-apis.js    # Resource management tests
node scripts/test-phase3-apis.js    # Scheduling engine tests
node scripts/test-phase4-apis.js    # Attendance & analytics tests
```

**CI/CD:** Tests run automatically on every push via GitHub Actions.

---

## 🐳 Docker Deployment

```bash
# Start with Docker Compose
docker-compose up --build

# Server: http://localhost:5000
# MySQL: localhost:3306
```

**Production deployment options:**
- Docker Compose (local/staging)
- Railway (instant cloud deploy)
- Render (free tier available)
- VPS with PM2 + Nginx

📖 [Full deployment guide](./docs/Deployment.md)

---

## 🎓 Use Cases

### For Educational Institutions
- Automated schedule conflict prevention
- Real-time room availability
- Student attendance tracking
- Resource utilization analytics

### For Developers
- Production-grade API architecture example
- Refresh token implementation reference
- Conflict detection algorithm
- Rate limiting patterns
- Docker + CI/CD setup

---

## 🛣️ Roadmap

**Current:** ✅ Staging-Ready

**Next Steps:**
- [ ] Add Prometheus metrics
- [ ] Implement log rotation
- [ ] Load test analytics endpoints
- [ ] Deploy to production environment

📋 [Complete roadmap](./docs/ProductionRoadmap.md)

---

## 📝 Project Structure

```
Classroom/
├── backend/
│   ├── config/          # Database connection
│   ├── controllers/     # Business logic (9 controllers)
│   ├── middleware/      # Auth, validation, error handling
│   ├── migrations/      # Database schema migrations (5 files)
│   ├── routes/          # API route definitions (10 modules)
│   ├── scripts/         # Migration + test scripts
│   ├── utils/           # Helpers (auth, logger, db, sanitize)
│   ├── Dockerfile       # Container image
│   ├── docker-compose.yml
│   └── server.js        # Entry point
├── docs/                # Comprehensive documentation
├── .github/workflows/   # CI/CD configuration
└── README.md           # This file
```

---

## 🤝 Contributing

Contributions welcome! Please see [Contributing Guide](./docs/Contributing.md).

---

## 📜 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

Built with industry best practices for authentication, scheduling, and data integrity.

---

**Questions?** Check the [documentation](./docs/) or open an issue.

**Ready to deploy?** See the [Deployment Guide](./docs/Deployment.md).
