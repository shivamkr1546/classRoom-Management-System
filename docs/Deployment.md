# Deployment Guide

## Current Status: Staging-Ready ✅

This system is ready for deployment to staging environments. Production deployment requires additional monitoring and load testing (see [ProductionRoadmap.md](./ProductionRoadmap.md)).

---

## Quick Deploy Options

### Option 1: Docker Compose (Recommended for Local/Staging)

**Prerequisites:**
- Docker Desktop installed
- 4GB RAM available

**Steps:**
```bash
cd backend
docker-compose up --build

# Server available at: http://localhost:5000
# MySQL available at: localhost:3306
```

**Configuration:**
Create `.env` file (copy from `.env.example`):
```env
NODE_ENV=production
PORT=5000
DB_HOST=db
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=classroom_db
JWT_SECRET=generate_32_char_random_string
JWT_REFRESH_SECRET=different_32_char_random_string
FRONTEND_URL=http://localhost:5173
```

**Health Check:**
```bash
curl http://localhost:5000/health
```

---

### Option 2: Railway (Fastest Cloud Deploy)

**Time:** ~5 minutes

1. **Push to GitHub** (if not already)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO
   git push -u origin main
   ```

2. **Deploy to Railway:**
   - Go to https://railway.app
   - "New Project" → "Deploy from GitHub"
   - Select your repository
   - Railway auto-detects Dockerfile
   - Add MySQL service from Railway marketplace

3. **Set Environment Variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=<generate random>
   JWT_REFRESH_SECRET=<generate random>
   DB_HOST=<railway mysql host>
   DB_USER=<railway mysql user>
   DB_PASSWORD=<railway mysql password>
   DB_NAME=classroom_db
   ```

4. **Run Migrations:**
   - Railway console: `npm run migrate`

5. **Access:** Railway provides a public URL

---

### Option 3: Render (Free Tier Available)

**Time:** ~10 minutes

1. **Push to GitHub**

2. **Create Render Account:** https://render.com

3. **Create MySQL Database:**
   - "New" → "PostgreSQL" (free tier) OR use external MySQL

4. **Create Web Service:**
   - "New" → "Web Service"
   - Connect GitHub repo
   - Build Command: `npm install`
   - Start Command: `npm start`

5. **Environment Variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=<generate>
   JWT_REFRESH_SECRET=<generate>
   DB_HOST=<your mysql host>
   DB_USER=<user>
   DB_PASSWORD=<password>
   DB_NAME=classroom_db
   ```

6. **Health Check Path:** `/health`

---

## VPS Deployment (Production-Grade)

### Prerequisites
- Ubuntu 20.04+ VPS
- Domain name (optional but recommended)
- 2GB+ RAM

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

### Step 2: Deploy Application

```bash
# Create app directory
sudo mkdir -p /var/www/classroom
cd /var/www/classroom

# Clone repository
git clone YOUR_REPO_URL .
cd backend

# Install dependencies
npm ci --production

# Create .env file
sudo nano .env
# Copy environment variables

# Run migrations
npm run migrate

# Start with PM2
pm2 start server.js --name classroom-api
pm2 startup
pm2 save
```

### Step 3: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/classroom
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/classroom /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## GitHub Actions CI/CD

**File:** `.github/workflows/ci.yml` (already created)

**What it does:**
1. Runs on every push to main/develop
2. Spins up MySQL test database
3. Runs migrations
4. Executes all test suites (Phase 2, 3, 4)
5. Fails build if tests fail

**Check Status:**
- Go to GitHub → "Actions" tab
- View test results for each commit

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production`, `development`, `test` |
| `PORT` | No | Server port | `5000` (default) |
| `DB_HOST` | Yes | MySQL hostname | `localhost`, `db`, `mysql.railway.app` |
| `DB_USER` | Yes | MySQL username | `root` |
| `DB_PASSWORD` | Yes | MySQL password | `secure_password_here` |
| `DB_NAME` | Yes | Database name | `classroom_db` |
| `JWT_SECRET` | Yes | Access token secret | 32+ character random string |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret | Different 32+ character string |
| `FRONTEND_URL` | No | CORS allowed origin | `http://localhost:5173` |

**Generate Secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Migrations

**Initial Setup:**
```bash
npm run migrate
```

**Manual Migration (if needed):**
```bash
mysql -u root -p
```
```sql
CREATE DATABASE classroom_db;
USE classroom_db;
SOURCE migrations/001_create_tables.sql;
SOURCE migrations/002_seed_data.sql;
SOURCE migrations/003_phase4_schema_fixes.sql;
SOURCE migrations/004_add_status_to_schedules.sql;
SOURCE migrations/005_refresh_tokens.sql;
```

---

## Monitoring & Health Checks

### Health Endpoint
```bash
curl http://your-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "environment": "production"
}
```

### PM2 Monitoring
```bash
pm2 status
pm2 logs classroom-api
pm2 monit  # Real-time monitoring
```

### Nginx Access Logs
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## Backup & Recovery

### Database Backup
```bash
# Backup
mysqldump -u root -p classroom_db > backup_$(date +%Y%m%d).sql

# Restore
mysql -u root -p classroom_db < backup_20240101.sql
```

### Automated Backups (Cron)
```bash
crontab -e
```
```cron
# Daily backup at 2 AM
0 2 * * * mysqldump -u root -pYOUR_PASSWORD classroom_db > /backups/classroom_$(date +\%Y\%m\%d).sql
```

---

## Rollback Strategy

### Using PM2
```bash
# Save current version
pm2 save

# Deploy new version
git pull
npm ci
pm2 restart classroom-api

# If issues occur, rollback
git reset --hard HEAD~1
npm ci
pm2 restart classroom-api
```

### Using Docker
```bash
# Tag before deploying
docker tag classroom-api:latest classroom-api:backup

# Deploy new version
docker-compose up --build -d

# Rollback if needed
docker-compose down
docker tag classroom-api:backup classroom-api:latest
docker-compose up -d
```

---

## Performance Tuning

### PM2 Cluster Mode
```bash
pm2 start server.js -i max --name classroom-api
```

### Nginx Caching
Add to Nginx config:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m inactive=60m;
proxy_cache_key "$scheme$request_method$host$request_uri";

location /api/ {
    proxy_cache my_cache;
    proxy_cache_valid 200 10m;
    # ... rest of proxy config
}
```

### MySQL Connection Pool
In `.env`:
```env
DB_CONNECTION_LIMIT=20
```

---

## Troubleshooting

### Server Won't Start
```bash
# Check logs
pm2 logs classroom-api

# Common issues:
# 1. Database connection - verify DB_HOST, DB_USER, DB_PASSWORD
# 2. Port already in use - kill process or change PORT
# 3. Missing migrations - run: npm run migrate
```

### 502 Bad Gateway
```bash
# Check if server is running
pm2 status

# Check Nginx config
sudo nginx -t

# Restart services
pm2 restart classroom-api
sudo systemctl reload nginx
```

### Database Connection Refused
```bash
# Check MySQL status
sudo systemctl status mysql

# Verify user permissions
mysql -u root -p
```
```sql
GRANT ALL PRIVILEGES ON classroom_db.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS (Let's Encrypt)
- [ ] Configure firewall (UFW)
  ```bash
  sudo ufw allow 22    # SSH
  sudo ufw allow 80    # HTTP
  sudo ufw allow 443   # HTTPS
  sudo ufw enable
  ```
- [ ] Disable root MySQL access from remote
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Enable fail2ban for SSH protection

---

**Next Steps:**
1. Deploy to staging environment
2. Run integration tests
3. Load test with realistic traffic
4. Set up monitoring (see [Monitoring.md](./Monitoring.md))
5. Plan production rollout
