# Hướng dẫn Deploy 2 Services lên Render với Keep-Alive

## 📋 Danh sách Services
1. **recommendation-ml** (Python FastAPI - port 8771)
2. **service-social** (Next.js - port 8767)

---

## 🚀 Step 1: Tạo Services trên Render

### A. Tạo recommendation-ml (Python)

1. Đăng nhập [Render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Kết nối GitHub repo
4. **Cấu hình:**
   - **Name:** `recommendation-ml`
   - **Environment:** `Python 3.11`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port 8771`
   - **Instance Type:** Free
   - **Auto-deploy:** ON (nếu muốn)

5. **Environment Variables** (cấu hình từ `.env`):
   ```
   REDIS_HOST=your-redis-url
   REDIS_PASSWORD=your-redis-password
   MINIO_ENDPOINT=your-minio-endpoint
   MINIO_ACCESS_KEY=your-key
   MINIO_SECRET_KEY=your-secret
   SOCIAL_SERVICE_URL=https://your-service-social.onrender.com
   MUSIC_SERVICE_URL=https://your-music-service-url
   ```

6. **Deploy** → Copy URL: `https://recommendation-ml-xxxx.onrender.com`

---

### B. Tạo service-social (Next.js)

1. Click **"New +"** → **"Web Service"**
2. **Cấu hình:**
   - **Name:** `service-social`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

3. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://api-gateway-xxxx.onrender.com
   MONGODB_URI=your-mongodb-connection
   REDIS_URL=your-redis-url
   MINIO_ENDPOINT=your-minio-endpoint
   MINIO_ACCESS_KEY=your-key
   MINIO_SECRET_KEY=your-secret
   RABBITMQ_URL=your-rabbitmq-url
   ```

4. **Deploy** → Copy URL: `https://service-social-xxxx.onrender.com`

---

## 🔄 Step 2: Setup GitHub Actions Keep-Alive

### ✅ File đã được tạo: `.github/workflows/keep-alive.yml`

**Cần cập nhật URLs:**

```bash
# Mở file .github/workflows/keep-alive.yml
# Thay thế những dòng này:
```

```yaml
- name: 'recommendation-ml'
  url: 'https://your-recommendation-ml.onrender.com/health'  # ← Thay URL thật
- name: 'service-social'
  url: 'https://your-service-social.onrender.com/health'    # ← Thay URL thật
```

### Cách lấy URLs:
1. Sau khi deploy xong trên Render, sẽ có URL tương tự:
   - recommendation-ml: `https://recommendation-ml-abc123.onrender.com`
   - service-social: `https://service-social-xyz789.onrender.com`

2. Cập nhật URLs vào file workflow

### 📤 Push code:
```bash
git add .github/workflows/keep-alive.yml
git commit -m "chore: add keep-alive workflow for Render services"
git push origin base
```

---

## 🏥 Step 3: Kiểm tra Health Endpoints

### recommendation-ml (FastAPI)
```bash
curl https://your-recommendation-ml.onrender.com/health
# Response: {"status": "ok"} hoặc tương tự
```

### service-social (Next.js)
Kiểm tra file `service-social/app/health/route.ts` để biết endpoint:
```bash
curl https://your-service-social.onrender.com/health
```

---

## 📊 Monitoring

### Cách kiểm tra workflow đang chạy:
1. GitHub → Actions tab
2. Tìm workflow `Keep Render Services Alive`
3. Xem logs để confirm ping status

### Dấu hiệu hoạt động tốt:
- ✅ Workflow chạy mỗi 10 phút
- ✅ HTTP Status 200 khi ping
- ✅ Services không bị sleep

---

## 💡 Các ghi chú quan trọng

### Về Render Free Tier:
- 🟢 Keep-alive workflow sẽ prevent auto-sleep
- 🟢 GitHub Actions (public repo) = **hoàn toàn FREE**
- 🟡 Bandwidth limited (~100GB/month)
- 🟡 Nếu cần performance tốt hơn → Upgrade Starter Plan ($7/tháng)

### Health Endpoint Variables:
Nếu health endpoint không có sẵn, thêm vào:

**recommendation-ml (`app/main.py`):**
```python
@app.get("/health")
async def health():
    return {"status": "ok", "service": "recommendation-ml"}
```

**service-social (`app/health/route.ts`):**
```typescript
export async function GET() {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## 🔐 Best Practices

1. **Không để URL công khai trong repo:**
   - Nếu muốn bảo mật → Dùng GitHub Secrets
   - Thêm vào Settings → Secrets and variables → Actions
   - Sử dụng `${{ secrets.RECOMMENDATION_ML_URL }}`

2. **Timeout settings:**
   - Render auto-sleep sau 15 phút inactivity
   - Workflow ping mỗi 10 phút = **an toàn**

3. **Cost tracking:**
   - GitHub Actions: FREE cho public repos
   - Render Free: FREE nhưng limited resources

---

## 🆘 Troubleshooting

| Vấn đề | Giải pháp |
|--------|----------|
| Service vẫn bị sleep | Kiểm tra URLs trong workflow có đúng không |
| Health endpoint 404 | Thêm `/health` route vào service |
| Workflow không chạy | Check GitHub Actions enabled trong repo |
| HTTP 500 từ health | Service khởi động lỗi → Check Render logs |

---

Generated: 2026-04-04
