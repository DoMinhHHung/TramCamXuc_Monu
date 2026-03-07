# TramCamXuc Microservices

Professional documentation for the PhazelSound music streaming platform.

## 1) System Overview

TramCamXuc is a Spring Boot microservices system with service discovery and event-driven processing.

```text
Client / Frontend
      |
      v
[API Gateway :8080]
      |
      +--> [Identity Service :8081] -----> PostgreSQL (identity)
      |
      +--> [Music Service :8083] --------> PostgreSQL (music)
      |            |   \                  Redis cache
      |            |    \-> MinIO (raw/public objects)
      |            |
      |            +--(song.transcode)--> RabbitMQ --> [Transcode Service :8085]
      |                                          ^             |
      |                                          |             v
      |                               (song.transcode.success) MinIO + ffmpeg
      |
      +--> [Social Service :8086] -----> MongoDB (social) + Redis
                   ^
                   |
          (song.listened events)

Service Registry: Eureka
Internal sync: RabbitMQ events + FeignClient (music-service -> identity-service)
```

## 2) Technology Visuals

| Technology  | Icon                                                                                                                          |
|-------------|-------------------------------------------------------------------------------------------------------------------------------|
| Spring Boot | ![Spring Boot](https://img.icons8.com/color/144/spring-logo.png)                                                              |
| RabbitMQ    | ![RabbitMQ](https://raw.githubusercontent.com/docker-library/docs/81187b7b50f5af5bdb64d75882f4d9c782ad52c3/rabbitmq/logo.png) |
| PostgreSQL  | ![PostgreSQL](https://img.icons8.com/color/144/postgreesql.png)                                                               |
| MongoDB     | ![MongoDB](https://img.icons8.com/color/144/mongodb.png)                                                                      |
| MinIO       | ![MinIO](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcREG8jyqzN6bGtlhPDxiGvYNCz8NFexta1baw&s)                        |
| Redis       | ![Redis](https://img.icons8.com/color/144/redis.png)                                                                          |
| Docker      | ![Docker](https://img.icons8.com/color/144/docker.png)                                                                        |
| PayOS       | ![PayOS](data:image/png;base64,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)                                                                         |

## 3) Directory Structure

```text
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

## 4) Inter-service Communication

### 4.1 RabbitMQ Topology (key flows)

| Exchange | Routing Key | Queue | Producer | Consumer |
|---|---|---|---|---|
| `jamendo.exchange` | `jamendo.download.routing` | `jamendo.download.queue` | music-service (JamendoImportServiceImpl) | music-service (JamendoDownloadWorker) |
| `jamendo.exchange` | `jamendo.download.dead` | `jamendo.download.dlq` | RabbitMQ DLX | Ops/retry flow |
| `music.exchange` | `song.transcode` | `transcode.queue` | music-service | transcode-service |
| `music.exchange` | `song.transcode.success` | `transcode.success.queue` | transcode-service | music-service |
| `music.exchange` | `song.transcode.dead` | `transcode.dlq` | RabbitMQ DLX | Ops/retry flow |
| `music.event.exchange` | `song.listened` | `listen.history.queue` | music-service | social-service |
| `music.event.exchange` | `song.listened` | `listen.trending.queue` | music-service | music-service |
| `identity.exchange` | `artist.registered` | `identity.artist-registered.queue` | music-service | identity-service |
| `identity.exchange` | `subscription.active` | `identity.subscription.queue` | payment-service | identity-service |
| `config.exchange` | `config.free-plan` | `identity.free-plan.queue` | payment-service | identity-service |
| `notification.exchange` | `notification.email` | notification email queue | identity/payment/... | integration-service |

### 4.2 FeignClient Communication

- `music-service` calls `identity-service` via `IdentityClient` (`@FeignClient(name = "identity-service", path = "/internal")`) for internal user/role operations.

## 5) Runtime Ports (from service configs)

- API Gateway: `8080`
- Identity Service: `8081`
- Music Service: `8083`
- Payment Service: `8084`
- Transcode Service: `8085`
- Social Service: `8086`
- Eureka: `8761`

## 6) Notes

- Core streaming and Jamendo async import are implemented asynchronously for resilience and scale.
- Message ACK/NACK + DLQ design is used for failure isolation.
- API-level details are documented inside each module README (including payment-service).
