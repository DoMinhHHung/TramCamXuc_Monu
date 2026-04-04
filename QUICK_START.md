# ⚡ 5-Minute Quick Start

## The Problem
Render free tier sleeps after 15 mins of inactivity → cold starts suck

## The Solution  
GitHub Actions (FREE) pings your services every 10 mins → No sleep = Always fast ✅

---

## 3 Simple Steps

### Step 1: Push Current Work
```bash
git add .github/workflows/keep-alive.yml
git commit -m "docs: add Render deployment setup"
git push origin base
```

### Step 2: Deploy on Render
1. Go to https://render.com → New Web Service
2. Connect your GitHub repo
3. Deploy `recommendation-ml` (FastAPI)
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port 8771`
4. Deploy `service-social` (Next.js)
   - Start Command: `npm start`
   - Set: `NEXT_PUBLIC_RECOMMENDATION_ML_URL=<recommendation-ml-url>`

### Step 3: Update Keep-Alive Workflow
After getting your Render URLs:
```bash
# Edit .github/workflows/keep-alive.yml
# Replace:
#   'https://your-recommendation-ml.onrender.com/health'
# With:
#   'https://recommendation-ml-abc123.onrender.com/health'
# 
# Replace:
#   'https://your-service-social.onrender.com/health'
# With:
#   'https://service-social-xyz789.onrender.com/health'

git add .github/workflows/keep-alive.yml
git commit -m "chore: update keep-alive URLs for production"
git push origin base
```

Done! ✅

---

## How It Works

```
Every 10 minutes:
  GitHub Actions (FREE) 
    → Calls /health endpoint on both services
    → Prevents auto-sleep
    → Services always responsive
```

---

## What I Created For You

| File | Purpose |
|------|---------|
| `.github/workflows/keep-alive.yml` | Auto-ping services every 10 mins |
| `DEPLOYMENT_GUIDE.md` | Full step-by-step instructions |
| `RENDER_DEPLOYMENT_CHECKLIST.md` | Interactive checkbox checklist |
| `ENV_VARIABLES_GUIDE.md` | Environment variable reference |
| `PRE_DEPLOYMENT_SUMMARY.md` | Complete overview before deploying |

---

## Status Check

✅ Both services have `/health` endpoints ready
✅ GitHub Actions workflow created
✅ Documentation complete
⏳ Ready to deploy when you are

---

## Cost? 
🎉 **FREE!**
- GitHub Actions: Free for public repos
- Render: Free tier (no upgrades needed)
- Keep-alive: Minimal CPU usage

---

Questions? See `PRE_DEPLOYMENT_SUMMARY.md` for detailed info.
