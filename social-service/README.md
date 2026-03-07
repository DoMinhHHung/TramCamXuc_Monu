# social-service

## Introduction
`social-service` manages community interactions around songs and artists: follows, reactions, hearts, comments, shares, and listen-history analytics.

## Tech Stack
- Spring Boot 3
- Spring Web + Validation
- Spring Data MongoDB (social domain data)
- Spring Data Redis (caching)
- Spring AMQP (listen-event ingestion)
- Spring Security (JWT)
- OpenAPI/Swagger (springdoc)

## Core Logic

### 1) Social interaction APIs
- CRUD-like endpoints for comments and reactions.
- Heart/follow state checks and counters.
- Share endpoint for generated social links/QR support.

### 2) Event-driven listen tracking
1. `ListenEventListener` consumes `song.listened` from `listen.history.queue`.
2. `ListenHistoryService` records user-song listening activity in MongoDB.
3. Stats endpoints query aggregated listen data.

## API Documentation (Swagger & Postman)

### Direct service URL
- Swagger UI: `http://localhost:8086/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8086/v3/api-docs`

### Gateway URL examples
- Configured gateway route: `http://localhost:8080/api/v1/social/...`
- Controller mappings inside service are under `/social/...`.

### JWT Bearer Token
Use for protected endpoints:

```http
Authorization: Bearer <access_token>
```

## Testing Guide (Postman)

### A. Add reaction
- Method: `POST`
- URL (direct): `http://localhost:8086/social/reactions`
- Header: `Authorization: Bearer <user_token>`
- Body example:

```json
{
  "songId": "8bdf4f8b-7465-45dc-bcc8-86b355fef999",
  "type": "LIKE"
}
```

### B. Create comment
- Method: `POST`
- URL: `http://localhost:8086/social/comments`
- Header: `Authorization: Bearer <user_token>`
- Body example:

```json
{
  "songId": "8bdf4f8b-7465-45dc-bcc8-86b355fef999",
  "content": "Great track!",
  "parentId": null
}
```

### C. Follow artist
- Method: `POST`
- URL: `http://localhost:8086/social/follows`
- Header: `Authorization: Bearer <user_token>`
- Body example:

```json
{
  "artistId": "920d26ef-3117-4eec-9f55-c84ec998e2cb"
}
```

### D. Read personal listen history
- Method: `GET`
- URL: `http://localhost:8086/social/listen-history/my`
- Header: `Authorization: Bearer <user_token>`
