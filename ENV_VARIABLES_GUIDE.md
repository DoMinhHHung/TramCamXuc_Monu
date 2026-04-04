# 🔧 Environment Variables Reference

## 📝 recommendation-ml (Python FastAPI)

### Required Variables
```bash
# Service Identity
APP_PORT=8771                          # Don't change on Render (auto)
DEBUG=false                            # Set to 'true' for local dev

# Downstream Services
SOCIAL_SERVICE_URL=https://service-social-xxxx.onrender.com
MUSIC_SERVICE_URL=https://your-music-service.com
INTERNAL_SERVICE_SECRET=your-secret-key

# Redis (Caching + Model versions)
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_SSL=true                         # Usually true for cloud Redis

# MinIO (Model storage)
MINIO_ENDPOINT=minio.oopsgolden.id.vn
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=password123
MINIO_SECURE=true                      # true if using HTTPS
MINIO_BUCKET=ml-models

# Cache TTLs (optional - defaults already set)
REDIS_CF_VECTOR_TTL=86400              # 24h for user vectors
REDIS_CB_VECTOR_TTL=172800             # 48h for song vectors
REDIS_RESULT_TTL=3600                  # 1h for results cache

# Logging (optional)
LOG_LEVEL=info
```

### Optional Variables for Features
```bash
# Scheduled Training
ENABLE_SCHEDULER=true
SCHEDULER_INTERVAL=3600                # Run training every hour

# Model Versions
CF_MODEL_VERSION=                       # Auto-managed by Redis
CB_MODEL_VERSION=                       # Auto-managed by Redis
```

### How to get these values:
- **REDIS:** 
  - Use Upstash.io (free tier available)
  - Or AWS ElastiCache / Azure Cache for Redis
- **MinIO:**
  - Self-hosted or cloud provider
  - Or DigitalOcean Spaces / AWS S3
- **MUSIC_SERVICE_URL:**
  - If deployed: `https://music-service-xxxx.onrender.com`
  - Or external: `https://music.oopsgolden.id.vn`

---

## 🎨 service-social (Next.js)

### Required Variables
```bash
# Public React variables (visible in browser - no secrets!)
NEXT_PUBLIC_API_URL=https://api-gateway-xxxx.onrender.com
NEXT_PUBLIC_RECOMMENDATION_ML_URL=https://recommendation-ml-xxxx.onrender.com

# Server-side variables (Node.js runtime only)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
REDIS_URL=redis://user:pass@host:port
RABBITMQ_URL=amqp://user:pass@host:5672

# MinIO (File upload/streaming)
MINIO_ENDPOINT=minio.oopsgolden.id.vn
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=password123
MINIO_USE_SSL=true                     # true for HTTPS
MINIO_BUCKET_NAME=monu-social          # Bucket name

# Feature flags
NEXT_PUBLIC_ENABLE_COMMENTS=true
NEXT_PUBLIC_ENABLE_SHARES=true
NEXT_PUBLIC_ENABLE_REACTIONS=true
```

### Optional Variables
```bash
# Performance
NEXT_PUBLIC_REVALIDATE_TIME=60         # ISR revalidation (seconds)

# Analytics
NEXT_PUBLIC_GA_ID=                     # Google Analytics ID (if used)

# Debugging
DEBUG=                                 # Leave empty in production
```

### Important Notes:
- ✅ **NEXT_PUBLIC_* variables** can be seen in browser (put NO secrets here!)
- 🔒 **Other variables** are server-side only (safe for secrets)
- 📌 Render automatically sets `PORT=3000` (don't override)
- 📌 Next.js auto-uses port from `package.json` start script: `-p 8767`

---

## 📦 How to Set on Render

### Step 1: Go to Service Settings
```
Render Dashboard 
  → Your Service 
  → Settings 
  → Environment
```

### Step 2: Add Variables
- Click "Add Environment Variable"
- Key: `REDIS_HOST`
- Value: `your-actual-value`
- Click Save

### Step 3: Redeploy
- Service auto-restarts with new variables
- Or manual: Deploy tab → Manual Deploy

---

## 🔐 Security Best Practices

### ❌ Don't do this:
```bash
# Hardcoding secrets in code
const PASSWORD = "mypassword123"

# Committing .env files
git add .env

# Using same password for prod/dev
MINIO_SECRET_KEY=password123
```

### ✅ Do this:
```bash
# Render Environment Variables
MINIO_SECRET_KEY=<set in Render dashboard>

# Local development only
# .env.local (in .gitignore)
REDIS_PASSWORD=local-only-password

# Production uses Render variables
# Can be different from local
```

### Add to .gitignore:
```
.env
.env.local
.env.*.local
```

---

## 🧪 Testing Variables Locally

### recommendation-ml
```bash
cd recommendation-ml
cp .env.example .env          # Create from example (if exists)
# Edit .env with local values
python -m pytest tests/        # Run tests with variables
```

### service-social
```bash
cd service-social
cp .env.local.example .env.local   # Create from example (if exists)
# Edit .env.local
npm run dev                         # Test locally
```

---

## 📋 Render Dashboard Quick Links

Once deployed, get real values from:

### recommendation-ml Service
```
Render Dashboard
  → recommendation-ml
  → Settings
  → Environment Variables (see what's set)
  → Copy URL from main dashboard
```

### service-social Service
```
Render Dashboard
  → service-social
  → Settings
  → Environment Variables
  → Copy URL from main dashboard
```

---

## ⚡ Quick Copy-Paste Template

Copy and customize this for each service:

### For recommendation-ml on Render:
```
APP_PORT=8771
DEBUG=false
SOCIAL_SERVICE_URL=https://service-social-xxxx.onrender.com
MUSIC_SERVICE_URL=https://music.service.url
REDIS_HOST=your-redis.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=xxxxxxxxxxxx
MINIO_ENDPOINT=minio.oopsgolden.id.vn
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=xxxxxxxxxxxx
MINIO_BUCKET=ml-models
```

### For service-social on Render:
```
NEXT_PUBLIC_API_URL=https://api-gateway-xxxx.onrender.com
NEXT_PUBLIC_RECOMMENDATION_ML_URL=https://recommendation-ml-xxxx.onrender.com
MONGODB_URI=mongodb+srv://xxxxxxxxxxxx
REDIS_URL=redis://xxxxxxxxxxxx
RABBITMQ_URL=amqp://xxxxxxxxxxxx
MINIO_ENDPOINT=minio.oopsgolden.id.vn
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=xxxxxxxxxxxx
```

---

Updated: 2026-04-04
