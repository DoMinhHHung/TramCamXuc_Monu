# PhazelSound - Microservices Streaming Platform

## Architecture Overview
PhazelSound is a distributed music streaming and social interaction platform built with **Spring Boot 3** and **Spring Cloud**. The platform is decomposed into independently deployable services, fronted by a centralized API Gateway and coordinated through Eureka service discovery.

### Microservices
- **discovery-server**: Eureka registry for service discovery.
- **api-gateway** (WebFlux): single entrypoint, routing, rate limiting, centralized Swagger UI.
- **identity-service** (PostgreSQL): authentication, JWT, account and role management.
- **music-service** (PostgreSQL): songs, albums, playlists, streaming metadata, transcode integration.
- **social-service** (MongoDB): comments, reactions, shares, listen history.
- **payment-service** (PostgreSQL): subscription and payment workflows.
- **transcoder-service** (MinIO + FFmpeg): asynchronous audio transcoding pipeline.
- **notification-service**: email/event notifications.

### Communication Model
- **Synchronous**: REST over HTTP through API Gateway.
- **Asynchronous**: RabbitMQ domain events (e.g., `song.listened`, premium-upgrade events, transcode callbacks).

---

## Prerequisites (Infrastructure)
Before running Spring Boot services, start required infrastructure:

- PostgreSQL
- MongoDB
- Redis
- RabbitMQ
- MinIO

### Option A: Quick Docker Run Commands
```bash
# PostgreSQL
 docker run -d --name phazel-postgres -p 5432:5432   -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:15

# MongoDB
 docker run -d --name phazel-mongo -p 27017:27017 mongo:7

# Redis
 docker run -d --name phazel-redis -p 6379:6379 redis:7

# RabbitMQ (management UI at :15672)
 docker run -d --name phazel-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# MinIO (console at :9001)
 docker run -d --name phazel-minio -p 9000:9000 -p 9001:9001   -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin   minio/minio server /data --console-address ":9001"
```

### Option B: docker-compose.yml (recommended)
```yaml
version: "3.9"
services:
  postgres:
    image: postgres:15
    container_name: phazel-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  mongo:
    image: mongo:7
    container_name: phazel-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7
    container_name: phazel-redis
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management
    container_name: phazel-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"

  minio:
    image: minio/minio
    container_name: phazel-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  pg_data:
  mongo_data:
  minio_data:
```

---

## Centralized Swagger/OpenAPI Strategy
- API Gateway hosts **single Swagger UI**.
- Downstream services expose **OpenAPI JSON only** at `/v3/api-docs`.

### Dependencies
- **api-gateway (WebFlux)**:
  - `org.springdoc:springdoc-openapi-starter-webflux-ui`
- **identity/music/social/payment (WebMVC)**:
  - `org.springdoc:springdoc-openapi-starter-webmvc-api`

### Access
- Gateway Swagger UI: `http://localhost:8080/swagger-ui.html`
- Gateway-proxied docs:
  - `http://localhost:8080/identity/v3/api-docs`
  - `http://localhost:8080/music/v3/api-docs`
  - `http://localhost:8080/social/v3/api-docs`
  - `http://localhost:8080/payment/v3/api-docs`

---

## How to Run Locally in IntelliJ IDEA

### 0) Build/install shared library first (mandatory)
Run from repository root:
```bash
mvn -pl core -am clean install
```
This ensures `iuh.fit.se:core` is present in your local Maven repository for independent module startup.

### 1) Start infrastructure
Start Docker containers (PostgreSQL, MongoDB, Redis, RabbitMQ, MinIO).

### 2) Start applications in this boot order
To avoid connection/discovery race conditions, start in this exact sequence:

1. **discovery-server** (Eureka)
2. **api-gateway**
3. **identity-service**
4. **music-service**
5. **social-service**
6. **payment-service**
7. **transcoder-service**
8. **notification-service**

> Tip: If a service fails to register at first boot, restart that service after Eureka is up and healthy.

---

## End-to-End Testing Flow (Postman or Swagger)
Use Gateway URL `http://localhost:8080` for all API calls.

### 1) Create user
- Call Identity registration endpoint.
- Confirm user is persisted in identity PostgreSQL DB.

### 2) Login and obtain JWT
- Call Identity login endpoint.
- Save access token for Authorization header:
  - `Authorization: Bearer <token>`

### 3) Purchase Premium (Payment -> Identity via RabbitMQ)
- Call payment subscription/purchase endpoint.
- Simulate/complete PayOS callback as needed.
- Verify event flow:
  - `payment-service` publishes `UserUpgradedEvent`.
  - `identity-service` consumes and updates user role to `PREMIUM`.
- Validate role change via Identity profile/admin endpoint.

### 4) Stream a song (Gateway -> Music)
- Call music stream/listen endpoint with JWT.
- Verify music-service responses and song metadata state.

### 5) Verify play/listen propagation (Music -> Social via RabbitMQ)
- Music publishes `SongListenEvent` (`social.activity.exchange` / `song.listened`).
- Social consumes event and stores `ListenHistory` in MongoDB.
- Validate by querying social listen-history endpoint or Mongo collection.

---

## Operational Notes
- Keep RabbitMQ exchanges/queues/routing keys consistent across producer and consumer services.
- Use environment variables for credentials/secrets in non-local environments.
- Add health checks and observability dashboards before production rollout.

## License
Internal thesis/project use (update with your organization license policy).
