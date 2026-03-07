# music-service

## Introduction
`music-service` is the core domain service for catalog and playback logic: songs, albums, artists, genres, playlists, streaming links, and async Jamendo import.

## Tech Stack
- Spring Boot 3
- Spring Web + Validation
- Spring Data JPA + PostgreSQL
- Spring Data Redis (cache)
- Spring AMQP (RabbitMQ)
- MinIO SDK (object storage)
- OpenFeign (internal call to identity-service)
- Spring Security (JWT resource server)
- OpenAPI/Swagger (springdoc)

## Core Logic

### 1) User upload & streaming flow
1. Artist requests upload (`/api/v1/songs/request-upload`).
2. Song is created with `DRAFT` + `PENDING` transcode status.
3. Confirm endpoint publishes transcode request (`song.transcode`) to RabbitMQ.
4. `SongTranscodeResultListener` consumes `song.transcode.success`, updates HLS URL, duration, and moves song to `PUBLIC`.

### 2) Async Jamendo import flow
1. Admin triggers import via `POST /api/v1/admin/jamendo/import`.
2. `JamendoImportServiceImpl` fetches paginated Jamendo metadata and publishes `JamendoDownloadMessage` to `jamendo.exchange`.
3. `JamendoDownloadWorker` consumes from `jamendo.download.queue`, performs:
   - idempotency check (`existsByJamendoId`),
   - download audio,
   - upload raw bytes to MinIO,
   - genre whitelist canonicalization,
   - artist upsert,
   - song save,
   - publish transcode request,
   - manual ACK/NACK with DLQ fallback.

## API Documentation (Swagger & Postman)

### Direct service URL
- Swagger UI: `http://localhost:8083/swagger-ui/index.html`
- OpenAPI JSON: `http://localhost:8083/v3/api-docs`

### Gateway URL examples
- Base (configured): `http://localhost:8080/api/v1/songs/...`
- Also configured legacy route: `http://localhost:8080/service-music/...`

### JWT Bearer Token
For protected endpoints, include header:

```http
Authorization: Bearer <access_token>
```

In Postman:
1. Open request -> Authorization tab.
2. Type = Bearer Token.
3. Paste `access_token` from identity-service login.

## Testing Guide (Postman)

### A. Trigger Jamendo import (admin)
- Method: `POST`
- URL (direct): `http://localhost:8083/api/v1/admin/jamendo/import?tags=pop&limit=20`
- Header: `Authorization: Bearer <admin_token>`

Expected: immediate async summary `{ fetched, skipped, enqueued }`.

### B. Request upload
- Method: `POST`
- URL: `http://localhost:8083/api/v1/songs/request-upload`
- Header: `Authorization: Bearer <artist_token>`
- Body example:

```json
{
  "title": "Midnight Drive",
  "artistId": "8bdf4f8b-7465-45dc-bcc8-86b355fef999",
  "genreIds": [
    "e3ef937c-2779-41d4-8ed4-f8eed62c6d80"
  ],
  "durationSeconds": 210,
  "thumbnailUrl": "https://example.com/thumb.jpg"
}
```

### C. Confirm upload (publish transcode)
- Method: `POST`
- URL: `http://localhost:8083/api/v1/songs/{songId}/confirm`
- Header: `Authorization: Bearer <artist_token>`

### D. Play/listen event
- Method: `POST`
- URL: `http://localhost:8083/api/v1/songs/{songId}/listen`
- Header: `Authorization: Bearer <user_token>`

This emits `song.listened` for social analytics.
