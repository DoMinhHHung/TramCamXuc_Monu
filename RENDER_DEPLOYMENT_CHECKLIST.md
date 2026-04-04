# ✅ Render Deployment Checklist

## Phase 1: GitHub Actions Setup (LOCAL - NGAY BÂY GIỜ)

- [ ] File `.github/workflows/keep-alive.yml` đã được tạo
- [ ] Verify health endpoints OK:
  ```bash
  # Sau khi deploy, test 2 lệnh này:
  curl https://recommendation-ml-xxxx.onrender.com/health
  curl https://service-social-xxxx.onrender.com/health
  ```
- [ ] Cập nhật URLs thực tế vào `.github/workflows/keep-alive.yml`:
  - `your-recommendation-ml.onrender.com` → URL thực tế
  - `your-service-social.onrender.com` → URL thực tế
- [ ] Push code:
  ```bash
  git add .github/workflows/keep-alive.yml
  git commit -m "chore: add keep-alive workflow"
  git push origin base
  ```

---

## Phase 2: Deploy recommendation-ml (RENDER)

### Preparation
- [ ] Prepared environment variables:
  - [ ] REDIS_HOST
  - [ ] REDIS_PASSWORD
  - [ ] MINIO_ENDPOINT, ACCESS_KEY, SECRET_KEY
  - [ ] SOCIAL_SERVICE_URL (sẽ update later)
  - [ ] MUSIC_SERVICE_URL

### Render Setup
- [ ] Login vào [Render.com](https://render.com)
- [ ] Create New → Web Service
- [ ] Connect GitHub (TramCamXuc_Monu repo)
- [ ] Configuration:
  - [ ] Name: `recommendation-ml`
  - [ ] Root Directory: `recommendation-ml`
  - [ ] Build Command: `pip install -r requirements.txt`
  - [ ] Start Command: `uvicorn app.main:app --host 0.0.0.0 --port 8771`
  - [ ] Instance Type: Free (hoặc Starter $7/tháng nếu muốn)
  - [ ] Auto-deploy: ON

### Post-Deployment
- [ ] Copy URL: `https://recommendation-ml-XXXX.onrender.com`
- [ ] Test health:
  ```bash
  curl https://recommendation-ml-XXXX.onrender.com/health
  # Expected: {"status": "healthy", ...}
  ```
- [ ] **✋ STOP: Save URL, dùng cho bước tiếp theo**

---

## Phase 3: Deploy service-social (RENDER)

### Preparation
- [ ] Updated `service-social/next.config.js` (nếu cần):
  - [ ] Output: standalone (recommended for serverless)
  ```js
  const nextConfig = {
    output: 'standalone',
    // ...
  };
  ```

### Render Setup
- [ ] Create New → Web Service
- [ ] Configuration:
  - [ ] Name: `service-social`
  - [ ] Root Directory: `service-social`
  - [ ] Build Command: `npm install && npm run build`
  - [ ] Start Command: `npm start`
  - [ ] Instance Type: Free

### Environment Variables
- [ ] NEXT_PUBLIC_API_URL=`https://api-gateway-XXXX.onrender.com`
- [ ] NEXT_PUBLIC_RECOMMENDATION_ML_URL=`https://recommendation-ml-XXXX.onrender.com`
- [ ] MONGODB_URI
- [ ] REDIS_URL
- [ ] MINIO_* variables
- [ ] RABBITMQ_URL

### Post-Deployment
- [ ] Copy URL: `https://service-social-XXXX.onrender.com`
- [ ] Test health:
  ```bash
  curl https://service-social-XXXX.onrender.com/health
  # Expected: {"status": "UP"}
  ```

---

## Phase 4: Update Keep-Alive Workflow (GITHUB)

- [ ] Update `.github/workflows/keep-alive.yml` với URLs thực tế:
  ```yaml
  - name: 'recommendation-ml'
    url: 'https://recommendation-ml-XXXX.onrender.com/health'
  - name: 'service-social'
    url: 'https://service-social-XXXX.onrender.com/health'
  ```
- [ ] Commit & Push
- [ ] Verify workflow runs:
  - [ ] GitHub → Actions tab
  - [ ] Look for "Keep Render Services Alive" workflow
  - [ ] Check lần chạy mới nhất có ✅ status

---

## Phase 5: Integration & Testing

### Update service-social to connect to recommendation-ml
- [ ] In `service-social/.env.local`:
  ```
  NEXT_PUBLIC_RECOMMENDATION_ML_URL=https://recommendation-ml-XXXX.onrender.com
  ```
- [ ] Update any API calls to point to recommendation-ml service

### Update recommendation-ml to connect to service-social
- [ ] In `recommendation-ml/.env`:
  ```
  SOCIAL_SERVICE_URL=https://service-social-XXXX.onrender.com
  ```
- [ ] Recommit & Render auto-redeploys

### End-to-End Testing
- [ ] recommendation-ml health check: ✅
- [ ] service-social health check: ✅
- [ ] recommendation-ml can call service-social: ✅
- [ ] GitHub Actions runs every 10 minutes: ✅
- [ ] Services stay awake (test after 15+ mins of no traffic): ✅

---

## Phase 6: Monitoring (Ongoing)

- [ ] Check GitHub Actions logs weekly
- [ ] Monitor Render dashboard for usage/errors
- [ ] If services slow down:
  - Option A: Upgrade to Starter Plan ($7/mo each)
  - Option B: Setup custom domain with CloudFlare (cache static content)
  - Option C: Scale to higher tier

---

## 🚨 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Service unavailable" after 15 mins | Keep-alive workflow not running → Check GitHub Actions |
| Health endpoint returns 404 | Service might not be running → Check Render logs |
| Keep-alive workflow fails | URLs wrong in workflow file → Update & recommit |
| Cold start takes 30+ seconds | Normal for free tier → Upgrade if needed |

---

## 📞 Need Help?

1. Check Render logs: Dashboard → service → Logs
2. Check GitHub Actions: Actions → Keep Render Services Alive → Latest run
3. Test endpoints manually:
   ```bash
   curl -v https://service-name-xxxx.onrender.com/health
   ```

---

Last updated: 2026-04-04
