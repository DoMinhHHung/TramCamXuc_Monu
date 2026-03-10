# TramCamXuc Microservices

Professional documentation for the **PhazelSound music streaming platform**.

---

# 1. System Overview

TramCamXuc là hệ thống **Spring Boot Microservices** sử dụng **Service Discovery** và **Event‑Driven Architecture**.

```
Client / Frontend
      |
      v
[API Gateway :8080]
      |
      +--> [Identity Service :8081] -----> PostgreSQL (identity)
      |
      +--> [Music Service :8083] --------> PostgreSQL (music)
      |            |   \
      |            |    \-> MinIO (raw/public objects)
      |            |
      |            +--(song.transcode)--> RabbitMQ --> [Transcode Service :8085]
      |                                          ^             |
      |                                          |             v
      |                               (song.transcode.success) MinIO + ffmpeg
      |
      +--> [Payment Service :8084] -----> PostgreSQL (payment)
      |
      +--> [Social Service :8086] -----> MongoDB (social) + Redis
                   ^
                   |
          (song.listened events)

Service Registry: Eureka
Internal sync: RabbitMQ events + FeignClient
```

---

# 2. Technology Stack

| Technology  | Description                     |
| ----------- | ------------------------------- |
| Spring Boot | Backend microservices framework |
| RabbitMQ    | Event-driven messaging          |
| PostgreSQL  | Relational database             |
| MongoDB     | Social data storage             |
| Redis       | Cache and counters              |
| MinIO       | Object storage for music files  |
| Docker      | Containerization                |
| PayOS       | Payment gateway                 |

---

# 3. Project Structure

```
.
├── api-gateway/
├── discovery-server/
├── identity-service/
├── integration-service/
├── music-service/
├── payment-service/
├── social-service/
├── transcode-service/
├── social/
└── pom.xml
```

---

# 4. Inter‑Service Communication

## 4.1 RabbitMQ Topology

| Exchange              | Routing Key              | Queue                            | Producer          | Consumer            |
| --------------------- | ------------------------ | -------------------------------- | ----------------- | ------------------- |
| jamendo.exchange      | jamendo.download.routing | jamendo.download.queue           | music-service     | music-service       |
| jamendo.exchange      | jamendo.download.dead    | jamendo.download.dlq             | RabbitMQ DLX      | retry flow          |
| music.exchange        | song.transcode           | transcode.queue                  | music-service     | transcode-service   |
| music.exchange        | song.transcode.success   | transcode.success.queue          | transcode-service | music-service       |
| music.exchange        | song.transcode.dead      | transcode.dlq                    | RabbitMQ DLX      | retry flow          |
| music.event.exchange  | song.listened            | listen.history.queue             | music-service     | social-service      |
| music.event.exchange  | song.listened            | listen.trending.queue            | music-service     | music-service       |
| identity.exchange     | artist.registered        | identity.artist-registered.queue | music-service     | identity-service    |
| identity.exchange     | subscription.active      | identity.subscription.queue      | payment-service   | identity-service    |
| config.exchange       | config.free-plan         | identity.free-plan.queue         | payment-service   | identity-service    |
| notification.exchange | notification.email       | notification email queue         | services          | integration-service |

---

## 4.2 FeignClient Communication

Example internal service call:

```java
@FeignClient(name = "identity-service", path = "/internal")
```

Used for:

* user validation
* role checking
* internal profile access

---

# 5. Runtime Ports

| Service           | Port |
| ----------------- | ---- |
| API Gateway       | 8080 |
| Identity Service  | 8081 |
| Music Service     | 8083 |
| Payment Service   | 8084 |
| Transcode Service | 8085 |
| Social Service    | 8086 |
| Eureka            | 8761 |

---

# 6. Testing Services via API Gateway

Base URL:

```
http://localhost:8080
```

All APIs should be tested through the gateway to simulate production traffic.

---

# 7. Swagger UI Access

| Service  | Swagger URL                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Identity | [http://localhost:8080/service-identity/swagger-ui/index.html](http://localhost:8080/service-identity/swagger-ui/index.html) |
| Music    | [http://localhost:8080/service-music/swagger-ui/index.html](http://localhost:8080/service-music/swagger-ui/index.html)       |
| Payment  | [http://localhost:8080/service-payment/swagger-ui/index.html](http://localhost:8080/service-payment/swagger-ui/index.html)   |
| Social   | [http://localhost:8080/service-social/swagger-ui/index.html](http://localhost:8080/service-social/swagger-ui/index.html)     |

---

# 8. OpenAPI JSON

Useful for importing APIs into Postman.

| Service  | OpenAPI URL                   |
| -------- | ----------------------------- |
| Identity | /service-identity/v3/api-docs |
| Music    | /service-music/v3/api-docs    |
| Payment  | /service-payment/v3/api-docs  |
| Social   | /service-social/v3/api-docs   |

---

# 9. Authentication Flow

## Step 1: Login

```
POST /api/v1/auth/login
```

Full URL:

```
http://localhost:8080/api/v1/auth/login
```

Example request body:

```json
{
  "email": "user1@example.com",
  "password": "StrongPass@123"
}
```

---

## Step 2: Copy Access Token

Response returns:

* accessToken
* refreshToken

---

## Step 3: Authorize Swagger

Click **Authorize** and enter:

```
Bearer <accessToken>
```

---

# 10. Service Testing Checklist

## 10.1 Identity Service

Important APIs:

```
POST /api/v1/auth/register
POST /api/v1/auth/verify-otp
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/users/me
```

Expected results:

* register creates user
* login returns tokens
* users/me returns correct profile

---

## 10.2 Music Service

### Public APIs

```
GET /api/v1/songs
GET /api/v1/songs/trending
GET /api/v1/songs/newest
GET /api/v1/songs/{songId}
POST /api/v1/songs/{songId}/play
POST /api/v1/songs/{songId}/listen
```

### Artist APIs

```
GET /api/v1/songs/{songId}/stream
GET /api/v1/songs/{songId}/download
POST /api/v1/songs/request-upload
POST /api/v1/songs/{songId}/confirm
GET /api/v1/songs/my-songs
```

Verification points:

* stream uses **presigned URL**
* listen events sent through RabbitMQ
* play counts aggregated via Redis

---

## 10.3 Payment Service

User flow:

```
GET /subscriptions/plans
POST /subscriptions/purchase
POST /payments/payos_transfer_handler
GET /subscriptions/my
```

Internal endpoint:

```
GET /api/internal/subscriptions/{userId}/status
```

Verify:

* webhook idempotency
* correct subscription expiration
* Redis subscription cache

---

## 10.4 Social Service

Main APIs:

```
POST /api/v1/social/reactions
POST /api/v1/social/comments
POST /api/v1/social/hearts
GET /api/v1/social/listen-history/me
```

AI pipeline test:

1. Send listen event
2. Verify listen.history.queue
3. Verify AI datalake queue
4. Verify batch file in MinIO

---

## 10.5 Transcode Service

Transcode service works asynchronously via RabbitMQ.

Test flow:

1. Request upload
2. Upload file
3. Confirm song

RabbitMQ events:

```
song.transcode
song.transcode.success
song.transcode.failed
```

Song status flow:

```
PENDING -> PROCESSING -> COMPLETED / FAILED
```

---

# 11. End‑to‑End Test Flow

Recommended test scenario:

1. Register user
2. Login
3. Call music APIs
4. Purchase subscription
5. Verify streaming access
6. Send listen event
7. Verify MongoDB history
8. Upload and transcode a song

---

# 12. Common Issues

## Swagger 404

Use:

```
/swagger-ui/index.html
```

Instead of:

```
/swagger-ui.html
```

---

## 401 / 403 Errors

Check Authorization header:

```
Bearer <token>
```

---

## Subscription Not Updated

Check Redis key:

```
user:subscription:{userId}
```

---

## AI Data Not Generated

Verify:

* listen.ai.datalake.queue
* AiDataLakeWorker logs
* MinIO bucket ai-training-data

---

# 13. Operational Notes

Best practices:

* Always test APIs through **API Gateway**
* Add **rate limiting** on listen/report endpoints
* Use **DLQ + retry** for RabbitMQ errors
* Export OpenAPI specs for automated testing

---

# Documentation Complete

This README can be used for:

* Developer onboarding
* QA testing
* Architecture overview
* Microservice documentation
