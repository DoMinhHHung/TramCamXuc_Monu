# Hướng dẫn test toàn bộ service bằng Swagger qua API Gateway

Tài liệu này hướng dẫn **test thủ công từng service** thông qua **API Gateway (`:8080`)** để không gọi trực tiếp từng microservice.

---

## 1) Mục tiêu

- Dùng 1 entry-point duy nhất: `http://localhost:8080`
- Mở Swagger UI của từng service **qua gateway**
- Reuse JWT token của Identity để test các API cần auth
- Có checklist test nhanh cho từng service

---

## 2) Điều kiện cần trước khi test

1. Đã chạy các hạ tầng nền:
   - Eureka
   - RabbitMQ
   - Redis
   - PostgreSQL / MongoDB
   - MinIO
2. Đã chạy các service:
   - `api-gateway` (8080)
   - `identity-service`
   - `music-service`
   - `payment-service`
   - `social-service`
   - `transcode-service` (worker)
3. Các service đã register vào Eureka.

> Khuyến nghị: mở RabbitMQ UI, Redis monitor, DB client để quan sát side-effect khi test.

---

## 3) Base URL & Swagger URL qua Gateway

### Base Gateway
- `http://localhost:8080`

### Swagger UI từng service qua Gateway
- Identity: `http://localhost:8080/service-identity/swagger-ui.html`
- Music: `http://localhost:8080/service-music/swagger-ui.html`
- Payment: `http://localhost:8080/service-payment/swagger-ui.html`
- Social: `http://localhost:8080/service-social/swagger-ui.html`

### OpenAPI JSON qua Gateway (nếu cần import Postman)
- Identity: `http://localhost:8080/service-identity/v3/api-docs`
- Music: `http://localhost:8080/service-music/v3/api-docs`
- Payment: `http://localhost:8080/service-payment/v3/api-docs`
- Social: `http://localhost:8080/service-social/v3/api-docs`

---

## 4) Luồng auth chuẩn (làm 1 lần trước khi test các API protected)

### Bước 1: Login lấy token
- Endpoint (qua gateway): `POST /api/v1/auth/login`
- URL đầy đủ: `http://localhost:8080/api/v1/auth/login`

Body ví dụ:
```json
{
  "email": "user1@example.com",
  "password": "StrongPass@123"
}
```

### Bước 2: Copy access token
- Lấy `accessToken` từ response.

### Bước 3: Authorize trong Swagger
- Bấm `Authorize` trong Swagger UI
- Nhập:
  ```
  Bearer <accessToken>
  ```

---

## 5) Checklist test theo từng service

---

## 5.1 Identity Service (qua gateway)
Swagger: `http://localhost:8080/service-identity/swagger-ui.html`

### Smoke test
1. `POST /api/v1/auth/register` — đăng ký user mới
2. `POST /api/v1/auth/verify-otp` — xác thực OTP
3. `POST /api/v1/auth/login` — đăng nhập
4. `POST /api/v1/auth/refresh` — refresh token
5. `GET /api/v1/users/me` — lấy profile (cần Bearer)

### Expected
- Register trả success + user info
- Login trả `accessToken` + `refreshToken`
- `/users/me` trả đúng user theo token

---

## 5.2 Music Service (qua gateway)
Swagger: `http://localhost:8080/service-music/swagger-ui.html`

### Public API
1. `GET /api/v1/songs`
2. `GET /api/v1/songs/trending`
3. `GET /api/v1/songs/newest`
4. `GET /api/v1/songs/{songId}`
5. `POST /api/v1/songs/{songId}/play`
6. `POST /api/v1/songs/{songId}/listen`

### Auth/Artist API
1. `GET /api/v1/songs/{songId}/stream` (Bearer)
2. `GET /api/v1/songs/{songId}/download` (Bearer)
3. `POST /api/v1/songs/request-upload` (ROLE_ARTIST)
4. `POST /api/v1/songs/{songId}/confirm` (ROLE_ARTIST)
5. `GET /api/v1/songs/my-songs` (ROLE_ARTIST)

### Test trọng điểm nên verify
- Stream URL là presigned, không phải public URL cố định
- Play/listen không lock DB (delta dồn Redis, flush theo lịch)
- Report song không tạo duplicate cho cùng `(user, song)`

---

## 5.3 Payment Service (qua gateway)
Swagger: `http://localhost:8080/service-payment/swagger-ui.html`

### User flow
1. `GET /subscriptions/plans` — lấy plan active
2. `POST /subscriptions/purchase` (Bearer)
3. Hoàn tất thanh toán qua PayOS sandbox
4. `POST /payments/payos_transfer_handler` (webhook)
5. `GET /subscriptions/my` (Bearer)

### Internal check (dev/test)
- `GET /api/internal/subscriptions/{userId}/status`
- URL qua gateway:
  `http://localhost:8080/service-payment/api/internal/subscriptions/{userId}/status`

### Test trọng điểm nên verify
- Webhook idempotent: gửi lại cùng payload không tạo side-effect lặp
- `startedAt/expiresAt` chỉ set khi payment `COMPLETED`
- Redis key `user:subscription:{userId}` được set đúng TTL

---

## 5.4 Social Service (qua gateway)
Swagger: `http://localhost:8080/service-social/swagger-ui.html`

### API chính
1. `POST /api/v1/social/reactions`
2. `POST /api/v1/social/comments`
3. `POST /api/v1/social/hearts`
4. `GET /api/v1/social/listen-history/me`

### Test pipeline AI Data Lake
1. Tạo listen event từ Music (`POST /api/v1/songs/{songId}/listen`)
2. Verify song listen được fanout
3. Verify:
   - Queue `listen.history.queue` nhận và ghi Mongo
   - Queue `listen.ai.datalake.queue` được `AiDataLakeWorker` consume
4. Kiểm tra MinIO bucket `ai-training-data` có file `.jsonl` batch mới

---

## 5.5 Transcode Service

> `transcode-service` là worker async qua RabbitMQ, thường **không có Swagger REST để test trực tiếp**.

### Cách test gián tiếp qua Gateway
1. Gọi Music API upload/confirm:
   - `POST /api/v1/songs/request-upload`
   - upload file qua presigned URL
   - `POST /api/v1/songs/{songId}/confirm`
2. Theo dõi RabbitMQ:
   - `song.transcode` request
   - `song.transcode.success` hoặc `song.transcode.failed`
3. Verify DB song ở music-service:
   - `transcodeStatus` chuyển `PENDING -> PROCESSING -> COMPLETED/FAILED`

---

## 6) Bộ test end-to-end tối thiểu (khuyến nghị)

1. Register + login user qua Identity
2. Dùng token gọi Music public + protected endpoint
3. Purchase gói qua Payment và xử lý webhook COMPLETED
4. Gọi lại Music stream/download để xác nhận quyền theo subscription
5. Gửi listen event, kiểm tra:
   - Mongo listen history cập nhật
   - MinIO `ai-training-data` có batch mới
6. Upload + confirm bài hát, theo dõi transcode success/fail flow

---

## 7) Lỗi thường gặp & cách xử lý nhanh

### 404 khi mở Swagger qua gateway
- Kiểm tra route gateway (`/service-identity/**`, `/service-music/**`, `/service-payment/**`, `/service-social/**`)
- Kiểm tra service đã register Eureka

### 401/403 trên endpoint protected
- Token hết hạn hoặc sai role
- Kiểm tra có prefix `Bearer ` đúng format

### Không thấy update subscription ở Music
- Kiểm tra Payment internal endpoint trả đúng `active/features/expiresAt`
- Kiểm tra Redis key `user:subscription:{userId}`

### Không thấy file AI ở MinIO
- Kiểm tra queue `listen.ai.datalake.queue`
- Kiểm tra log `AiDataLakeWorker` flush
- Kiểm tra biến môi trường MinIO và bucket `ai-training-data`

---

## 8) Ghi chú vận hành

- Chỉ dùng endpoint qua `:8080` để đảm bảo test giống production ingress.
- Với QA regression, nên export OpenAPI JSON qua gateway và auto-generate collection test.
- Nên thêm rate limit ở API Gateway cho report/listen endpoints để giảm abuse.

---

**Done.** Tài liệu này có thể dùng trực tiếp cho QA/UAT khi test từng service qua Swagger trên API Gateway.
