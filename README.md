# PhazelSound Microservices

Professional documentation for the PhazelSound music streaming platform.

## 1) System Overview

PhazelSound is a Spring Boot microservices system with service discovery and event-driven processing.

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

| Technology | Icon |
|---|---|
| Spring Boot | ![Spring Boot](https://img.icons8.com/color/144/spring-logo.png) |
| RabbitMQ | ![RabbitMQ](https://img.icons8.com/color/144/rabbitmq.png) |
| PostgreSQL | ![PostgreSQL](https://img.icons8.com/color/144/postgreesql.png) |
| MongoDB | ![MongoDB](https://img.icons8.com/color/144/mongodb.png) |
| MinIO | ![MinIO](https://min.io/resources/img/logo/minio-logo.svg) |
| Redis | ![Redis](https://img.icons8.com/color/144/redis.png) |
| Docker | ![Docker](https://img.icons8.com/color/144/docker.png) |

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
