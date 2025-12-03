# Production Hardening - Implementation Guide

## What Was Implemented

### ✅ 1. Rate Limiting & Brute-Force Protection

**Files Modified:**
- `server.js` - Added comprehensive rate limiting

**Protection Levels:**
1. **Global Rate Limiter**: 300 requests/min per IP
2. **Login Brute-Force Protection**: 5 attempts per 15 minutes
3. **Progressive Slowdown**: Adds 500ms delay after 3rd login attempt
4. **Bulk Operation Limiter**: 10 requests/min for bulk imports

**Test:** Try logging in 6 times with wrong password - you'll get rate limited.

---

### ✅ 2. Refresh Token Flow

**Files Created/Modified:**
- `migrations/005_refresh_tokens.sql` - New database table
- `controllers/auth.controller.js` - Complete rewrite with token management
- `routes/auth.routes.js` - Added new endpoints

**New API Endpoints:**
- `POST /api/auth/login` → Returns `{ accessToken, refreshToken }`
- `POST /api/auth/refresh` → Exchange refresh token for new access token
- `POST /api/auth/logout` → Revoke refresh token
- `POST /api/auth/revoke-all/:userId` → Admin: revoke all user tokens

**Security Features:**
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (30 days)
- SHA256 hashed token storage
- IP address and User-Agent tracking
- Token expiration checking
- Revocation support

---

### ✅ 3. Docker Configuration

**Files Created:**
- `Dockerfile` - Production-grade container image
- `docker-compose.yml` - MySQL + API orchestration
- `.dockerignore` - Optimized build context

**Features:**
- Health checks for both MySQL and API
- Volume persistence for database
- Environment variable configuration
- Network isolation
- Auto-restart policies

**Usage:**
```bash
docker-compose up --build
```

---

### ✅ 4. GitHub Actions CI

**Files Created:**
- `.github/workflows/ci.yml`

**What It Does:**
1. Spins up MySQL test database
2. Runs all migrations
3. Starts the server
4. Executes Phase 2, 3, and 4 test suites
5. Fails the build if any test fails

**Triggers:**
- Every push to main/develop
- Every pull request

---

## 🚀 Getting Started

### Step 1: Apply the Refresh Tokens Migration

**Option A: Using npm migrate (recommended):**
```bash
npm run migrate
```

**Option B: Manual SQL (if npm migrate fails):**
```sql
USE classroom_db;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token CHAR(64) NOT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_token (token)
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_token ON refresh_tokens(token, revoked);
```

---

### Step 2: Update Environment Variables

Add to your `.env` file:
```env
JWT_SECRET=your_super_secret_key_here_min_32_chars
JWT_REFRESH_SECRET=different_super_secret_for_refresh_tokens
```

**Important:** Generate strong secrets in production:
```bash
# On Linux/Mac
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use any password generator with 32+ characters
```

---

### Step 3: Restart the Server

```bash
npm start
```

---

## 🧪 Testing the New Features

### Test Rate Limiting

**Test Login Rate Limit:**
```bash
# Try logging in 6 times with wrong password
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@classroom.com","password":"wrongpassword"}'
  echo ""
done

# 6th attempt should return "Too many login attempts"
```

---

### Test Refresh Token Flow

**1. Login and get tokens:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@classroom.com",
    "password": "admin123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "abc123def456...",
    "expiresIn": "15m",
    "user": { ... }
  }
}
```

**2. Use access token (works for 15 min):**
```bash
curl http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**3. Refresh the access token:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "abc123def456..."
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",  // New access token
    "expiresIn": "15m"
  }
}
```

**4. Logout (revoke refresh token):**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "abc123def456..."
  }'
```

**5. Try to refresh after logout (should fail):**
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "abc123def456..."
  }'

# Should return: "Invalid or revoked refresh token"
```

---

### Test Docker

```bash
# Build and run
cd backend
docker-compose up --build

# Server will be available at http://localhost:5000
# Check health: curl http://localhost:5000/health

# Stop containers
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

---

## 📊 What's Production-Ready Now

| Feature | Status | Notes |
|---------|--------|-------|
| ✅ Core Features | Complete | All 4 phases working |
| ✅ Rate Limiting | Production-Ready | Prevents brute-force attacks |
| ✅ Refresh Tokens | Production-Ready | Secure session management |
| ✅ Token Revocation | Production-Ready | Forced logout capability |
| ✅ Request Validation | Production-Ready | Joi validation on all endpoints |
| ✅ CORS | Production-Ready | Configured for frontend |
| ✅ Docker | Production-Ready | Containerized + compose |
| ✅ CI/CD | Production-Ready | Automated testing on push |
| ⚠️ Monitoring | Partial | Logs exist but no metrics |
| ❌ Load Testing | Not Done | Don't know performance limits |
| ❌ Deployment | Not Done | No deployment strategy |

---

## Honest Assessment: Staging-Ready ✅

Your system is now **Staging-Ready**. You can:
- Deploy to a staging environment (Railway, Render, Fly.io)
- Start frontend development
- Run internal testing

**Before production deployment, you still need:**
1. Monitoring (Prometheus + Grafana) - 2 hours
2. Load testing (k6) - 2 hours
3. Deployment strategy (PM2 + Nginx or K8s) - 4 hours

**Estimated time to full production-ready:** 1-2 days

---

## Frontend Integration Notes

**Old Login Flow (deprecated):**
```javascript
// DON'T USE THIS ANYMORE
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { token } = await response.json();
localStorage.setItem('token', token); // ❌ Old way
```

**New Login Flow (use this):**
```javascript
// ✅ New way with refresh tokens
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { data } = await response.json();
localStorage.setItem('accessToken', data.accessToken);   // Short-lived
localStorage.setItem('refreshToken', data.refreshToken); // Long-lived
```

**Auto-refresh on 401:**
```javascript
// Intercept 401 responses and refresh token
async function fetchWithAuth(url, options = {}) {
  let accessToken = localStorage.getItem('accessToken');
  
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  // If access token expired, refresh it
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    if (refreshResponse.ok) {
      const { data } = await refreshResponse.json();
      localStorage.setItem('accessToken', data.accessToken);
      
      // Retry original request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${data.accessToken}`
        }
      });
    } else {
      // Refresh token invalid - force logout
      localStorage.clear();
      window.location.href = '/login';
    }
  }
  
  return response;
}
```

**Logout:**
```javascript
async function logout() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  localStorage.clear();
  window.location.href = '/login';
}
```

---

## Next Steps

1. **Test everything:**
   - ✅ Rate limiting works
   - ✅ Refresh tokens work
   - ✅ Docker builds successfully
   - ⬜ Push to GitHub and check CI

2. **Deploy to staging:**
   - Recommended: Railway or Render (free tier)
   - Takes 5-10 minutes to set up
   - Use the Dockerfile we created

3. **Build your frontend:**
   - Use the new token flow
   - Test logout and session expiry
   - Test rate limiting UX

4. **Add monitoring:**
   - Install `prom-client`
   - Add `/metrics` endpoint
   - Set up Grafana dashboard

Congratulations! You've hardened your system significantly. 🎉
