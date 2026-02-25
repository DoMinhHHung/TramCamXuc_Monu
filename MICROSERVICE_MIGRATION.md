# Microservice migration guide (v2)

## 1) Kiến trúc runtime mới

- **API Gateway** (`api-gateway`, port `8080`): điểm vào duy nhất cho Frontend.
- **Service Discovery** (`eureka-server`, port `8761`): đăng ký/tìm service tự động.
- Domain services:
  - `identity-service` (PostgreSQL riêng)
  - `music-service` (PostgreSQL riêng)
  - `payment-service` (PostgreSQL riêng)
  - `social-service` (MongoDB riêng)
  - `integration-service`
  - `transcode-worker`

## 2) Routing qua Gateway

Frontend chỉ gọi Gateway:

- `/api/v1/identity/**` -> `lb://IDENTITY-SERVICE`
- `/api/v1/music/**` -> `lb://MUSIC-SERVICE`
- `/api/v1/social/**` -> `lb://SOCIAL-SERVICE`
- `/api/v1/payment/**` -> `lb://PAYMENT-SERVICE`
- `/api/v1/integration/**` -> `lb://INTEGRATION-SERVICE`

Gateway dùng `StripPrefix=3` để forward path sạch xuống backend.

## 3) Auth tập trung tại Gateway

- Gateway verify JWT (HS256) bằng `jwt.signerKey`.
- Token hợp lệ -> inject headers:
  - `X-User-Id`
  - `X-User-Role`
- Backend services không decode JWT nữa, chỉ trust header từ gateway.

## 4) Rate limit tại Gateway (Redis + Bucket4j)

- Filter global theo IP.
- State bucket dùng Redis backend.
- Khi vượt ngưỡng -> trả `429 TOO_MANY_REQUESTS`.

Các biến cấu hình:
- `GATEWAY_RATE_LIMIT_CAPACITY`
- `GATEWAY_RATE_LIMIT_REFILL_SECONDS`
- `GATEWAY_RATE_LIMIT_REFILL_TOKENS`

## 5) Service discovery + call chéo bằng OpenFeign

- Các service đã đăng ký Eureka qua `eureka.client.service-url.defaultZone`.
- Ví dụ call chéo:
  - `music-service` gọi `IDENTITY-SERVICE` bằng OpenFeign (`@FeignClient(name = "IDENTITY-SERVICE")`) qua endpoint internal để check user tồn tại.
- Không hardcode IP/port trong call chéo.

## 6) Quy tắc Entity/Document (soft reference)

- Không tạo FK chéo database giữa microservices.
- Cross-service reference phải lưu dạng scalar ID (UUID/String), ví dụ `artist.userId`, `userSubscription.userId`.
- Các quan hệ JPA hiện tại chỉ tồn tại trong phạm vi database cùng service.

## 7) Distributed tracing

- Đã thêm Micrometer Tracing + Zipkin reporter cho gateway/eureka và toàn bộ domain services.
- Request flow sẽ có trace id xuyên suốt khi gọi qua các service.

## 8) Chạy local nhanh

```bash
cp .env.microservices.example .env
docker compose -f docker-compose.microservices.yml up -d
# NOTE: lệnh trên chỉ chạy hạ tầng (db/redis/rabbit/minio/zipkin), KHÔNG tự chạy gateway/service

./mvnw -pl eureka-server spring-boot:run
./mvnw -pl api-gateway spring-boot:run
./mvnw -pl identity spring-boot:run
./mvnw -pl music spring-boot:run
./mvnw -pl payment spring-boot:run
./mvnw -pl social spring-boot:run
./mvnw -pl integration spring-boot:run
./mvnw -pl transcoder spring-boot:run
```




### Nếu bạn muốn mở được `http://localhost:8080` bằng Docker Compose

Chạy thêm profile `apps` để khởi động cả Eureka + API Gateway:

```bash
docker compose -f docker-compose.microservices.yml --profile apps up -d eureka-server api-gateway
```

> Nếu bạn chạy service bằng IntelliJ thì **không cần** profile này, nhưng bắt buộc phải run `EurekaServerApplication` và `ApiGatewayApplication`.

## 9) Unauthenticated requests & Rate Limit

- Bucket4j rate limit chạy trước JWT filter ở Gateway (order thấp hơn).
- Vì vậy request **có token hay không có token** đều bị rate limit.
- Request không có token: Gateway ưu tiên header định danh máy (`X-Device-Id`) để tránh chặn cả cụm user chung một WiFi NAT.
- Nếu không có `X-Device-Id`, Gateway fallback theo tổ hợp `client-ip + user-agent`.
- Endpoint protected vẫn bị backend từ chối theo auth rule nếu thiếu token hợp lệ.

## 10) Advanced architecture docs

- `STREAMING_ARCHITECTURE.md`
- `ANALYTICS_TRENDING_PIPELINE.md`
- `PAYMENT_SAGA_ARCHITECTURE.md`
