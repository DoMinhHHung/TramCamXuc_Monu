# Microservice migration guide

Project đã được tách theo hướng **service độc lập + cấu hình riêng + database riêng**.

## 1) Service mới có thể chạy độc lập

- `identity` → `IdentityServiceApplication` (port mặc định `8082`)
- `music` → `MusicServiceApplication` (port mặc định `8083`)
- `payment` → `PaymentServiceApplication` (port mặc định `8084`)
- `social` → `SocialServiceApplication` (port mặc định `8085`)
- `integration` → `IntegrationServiceApplication` (port mặc định `8086`)
- `transcoder` → `TranscoderApplication` (port mặc định `8087`)

## 2) Cấu hình riêng theo từng service

Mỗi service đã có `src/main/resources/application.properties` riêng.

Bạn chỉ cần sao chép:

```bash
cp .env.microservices.example .env
```

sau đó điền secret thật vào `.env`.

## 3) Database tách riêng

- Identity: PostgreSQL `identity_db`
- Music: PostgreSQL `music_db`
- Payment: PostgreSQL `payment_db`
- Social: MongoDB `social_db`

Hạ tầng tham chiếu nằm ở `docker-compose.microservices.yml`.

## 4) Chạy local nhanh

```bash
docker compose -f docker-compose.microservices.yml up -d
./mvnw -pl identity spring-boot:run
./mvnw -pl music spring-boot:run
./mvnw -pl payment spring-boot:run
./mvnw -pl social spring-boot:run
./mvnw -pl integration spring-boot:run
./mvnw -pl transcoder spring-boot:run
```

## 5) Ghi chú kiến trúc

- `api-server` hiện vẫn giữ vai trò chạy “all-in-one” (monolith composition) để tương thích ngược.
- Luồng microservice mới tập trung vào chạy từng module độc lập để chuẩn bị tách gateway/service registry về sau.
