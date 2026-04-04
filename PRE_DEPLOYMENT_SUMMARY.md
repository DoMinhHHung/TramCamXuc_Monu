# 🎯 Pre-Deployment Final Checklist

## ✅ Summary of Changes Made

### 1. ✅ GitHub Actions Workflow
**File:** `.github/workflows/keep-alive.yml`
- Status: **CREATED** ✓
- Purpose: Auto-ping services every 10 minutes to prevent Render sleep
- Status: **Needs URL update** (see below)

### 2. ✅ Both Services Have Health Endpoints
- `recommendation-ml`: `/health` implemented ✓
- `service-social`: `/health` implemented ✓

### 3. 📋 Documentation Created
- `DEPLOYMENT_GUIDE.md` — Step-by-step deployment
- `RENDER_DEPLOYMENT_CHECKLIST.md` — Interactive checklist
- `ENV_VARIABLES_GUIDE.md` — Environment setup reference

---

## 🔴 ACTION REQUIRED - Do these NOW

### 1. Update `.github/workflows/keep-alive.yml` with Real URLs

After you deploy to Render, you'll get URLs like:
- `https://recommendation-ml-abc123.onrender.com`
- `https://service-social-xyz789.onrender.com`

Then update the workflow file with these real URLs.

**Currently in file (PLACEHOLDER):**
```yaml
- name: 'recommendation-ml'
  url: 'https://your-recommendation-ml.onrender.com/health'
- name: 'service-social'
  url: 'https://your-service-social.onrender.com/health'
```

---

### 2. (Optional) Optimize Next.js Config for Render

Add this to `service-social/next.config.js` for faster deployments:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ['amqplib', 'minio'],
  output: 'standalone',  // ← ADD THIS LINE
};

module.exports = nextConfig;
```

**Benefits:**
- ✅ Smaller build size (faster deployment)
- ✅ Self-contained (no .next folder needed)
- ✅ Better for serverless/container platforms like Render

---

### 3. Verify Health Endpoints Format

Both services should respond with 2xx status code:

```bash
# Test locally
curl http://localhost:8771/health      # recommendation-ml
curl http://localhost:8767/health      # service-social

# Should return:
# recommendation-ml: {"status": "healthy", ...}
# service-social: {"status": "UP"}
```

---

## 📝 Preparation: Before Deploying to Render

### A. recommendation-ml Setup
```bash
cd recommendation-ml
cp .env{.example,}      # Create from .env.example if exists
# Edit .env with your actual values:
# REDIS_HOST, REDIS_PASSWORD, MINIO_*, etc.

# Test locally
uvicorn app.main:app --reload
# Visit: http://localhost:8771/health
```

### B. service-social Setup
```bash
cd service-social
cp .env.local{.example,}  # Create from example
# Edit .env.local with local values

# Test locally
npm run dev
# Visit: http://localhost:8767/health
```

---

## 🚀 Deployment Order (IMPORTANT)

Since `service-social` needs `NEXT_PUBLIC_RECOMMENDATION_ML_URL`:

1. **Deploy recommendation-ml FIRST**
   - Get URL: `https://recommendation-ml-xxxx.onrender.com`
   - Test `/health` endpoint

2. **Deploy service-social SECOND**
   - Use recommendation-ml URL from step 1
   - Add to environment: `NEXT_PUBLIC_RECOMMENDATION_ML_URL=...`
   - Test `/health` endpoint

3. **Update GitHub Workflow THIRD**
   - Add both real URLs to `.github/workflows/keep-alive.yml`
   - Commit & push

4. **Verify Keep-Alive Works FOURTH**
   - Check GitHub Actions tab
   - Confirm workflow runs every 10 minutes
   - Confirm HTTP 200 responses

---

## 💾 Files Status Summary

| File | Status | Action |
|------|--------|--------|
| `.github/workflows/keep-alive.yml` | ✅ Created | Update URLs after deploy |
| `DEPLOYMENT_GUIDE.md` | ✅ Created | Reference as needed |
| `RENDER_DEPLOYMENT_CHECKLIST.md` | ✅ Created | Follow step-by-step |
| `ENV_VARIABLES_GUIDE.md` | ✅ Created | Copy env vars from here |
| `service-social/next.config.js` | ⚠️ Optional | Add `output: 'standalone'` |

---

## 🎬 Next Immediate Steps

### This Session:
```bash
# 1. Optionally update next.config.js
cd service-social
# Add output: 'standalone' to next.config.js

# 2. Commit files
git add .github/workflows/keep-alive.yml
git add DEPLOYMENT_GUIDE.md
git add RENDER_DEPLOYMENT_CHECKLIST.md
git add ENV_VARIABLES_GUIDE.md
git commit -m "docs: add Render deployment guides and keep-alive workflow"
git push origin base
```

### Later Sessions:
1. Deploy recommendation-ml to Render
2. Deploy service-social to Render
3. Get real URLs
4. Update `.github/workflows/keep-alive.yml` with real URLs
5. Commit & push
6. Verify workflow runs

---

## 🆘 Need Help During Deployment?

### Check These Docs in Order:
1. `RENDER_DEPLOYMENT_CHECKLIST.md` — Step-by-step with checkboxes
2. `ENV_VARIABLES_GUIDE.md` — What values to use
3. `DEPLOYMENT_GUIDE.md` — Detailed explanations

### Common URLs:
- Render Dashboard: https://dashboard.render.com
- GitHub Actions: https://github.com/your-repo/actions
- Upstash Redis: https://console.upstash.io (for Redis setup)

---

## 📊 Keep-Alive Solution Overview

```
┌─────────────────────────────────────────────┐
│     GitHub (Free for public repos)          │
│                                             │
│  Scheduler: Every 10 minutes                │
│  └─ GET /health (recommendation-ml)         │
│  └─ GET /health (service-social)            │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│        Render (Free tier)                   │
│                                             │
│  Services receive ping                      │
│  └─ Prevent auto-sleep after 15 mins       │
│  └─ Services stay active 24/7               │
│  └─ Users never hit cold start              │
└─────────────────────────────────────────────┘

Cost: $0/month (GitHub Actions + Render free)
```

---

Updated: 2026-04-04
Ready to deploy! 🚀
