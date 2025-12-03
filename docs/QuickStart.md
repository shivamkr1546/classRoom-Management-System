# Quick Start Guide

Get the Classroom Management System running in 5 minutes.

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MySQL** 8.0+ running locally
- **Git** ([Download](https://git-scm.com/))

---

## Step 1: Clone and Install

```bash
# Clone the repository
git clone YOUR_REPO_URL
cd Classroom/backend

# Install dependencies
npm install
```

---

## Step 2: Configure Environment

Create `.env` file from template:

```bash
# Copy example
cp .env.example .env

# Edit with your values
# Minimum required:
JWT_SECRET=your_secret_minimum_32_characters_here
JWT_REFRESH_SECRET=different_secret_minimum_32_chars
```

**.env template:**
```env
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=         # Leave empty if no password
DB_NAME=classroom_db

# Security (CRITICAL - Change these!)
JWT_SECRET=generate_a_long_random_string_here
JWT_REFRESH_SECRET=different_long_random_string_here

# Frontend (optional)
FRONTEND_URL=http://localhost:5173
```

**Generate secure secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 3: Setup Database

Make sure MySQL is running, then:

```bash
npm run migrate
```

This creates:
- Database `classroom_db`
- All tables with proper schema
- Seed data (3 users, 5 rooms, 3 courses, 20 students)

**Default users:**
- Admin: `admin@classroom.com` / `admin123`
- Instructor: `john@classroom.com` / `admin123`
- Coordinator: `jane@classroom.com` / `admin123`

---

## Step 4: Start Server

```bash
npm start
```

You should see:
```
🚀 Server running on port 5000
📝 Environment: development
🌐 CORS enabled for: http://localhost:5173
```

---

## Step 5: Test It Works

**Health Check:**
```bash
curl http://localhost:5000/health
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@classroom.com",
    "password": "admin123"
  }'
```

You should get a response with `accessToken` and `refreshToken`.

---

## You're Ready! 🎉

**Next steps:**
1. Explore the [API Reference](./APIReference.md)
2. Run the test suites: 
   ```bash
   node scripts/test-phase2-apis.js
   node scripts/test-phase3-apis.js
   node scripts/test-phase4-apis.js
   ```
3. Review [Architecture](./Architecture.md) to understand the system
4. Check [Security](./Security.md) for authentication details

---

## Common Issues

### "Database connection failed"
```bash
# Check if MySQL is running
mysql -V

# Try connecting manually
mysql -u root -p

# If it works, check your .env DB_* variables
```

### "Port 5000 already in use"
```bash
# Change port in .env
PORT=3000

# Or kill the process using 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5000 | xargs kill
```

### "JWT_SECRET not defined"
- Make sure you created `.env` file
- Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set

---

## Alternative: Docker Quick Start

If you have Docker installed:

```bash
cd backend
docker-compose up --build
```

Server runs on `http://localhost:5000`. That's it!

To stop:
```bash
docker-compose down
```

---

## What's Included?

After running migrations, you have:

**Users:**
- 1 Admin (full control)
- 1 Coordinator (scheduling, resource management)
- 1 Instructor (course management, attendance)

**Resources:**
- 5 Rooms (Classroom, Lab, Seminar rooms)
- 3 Courses (Computer Science, Mathematics, Physics)
- 20 Students across different classes

**Ready to use:**
- User management
- Course-Instructor assignments
- Student enrollments
- Schedule creation with conflict detection
- Attendance tracking
- Analytics

---

**Need help?** Check [Deployment.md](./Deployment.md) for more detailed setup options.
