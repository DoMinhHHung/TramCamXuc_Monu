# api-gateway

## Introduction
`api-gateway` is the single entry point for client requests. It provides service routing and discovery-based forwarding to downstream microservices.

## Tech Stack
- Spring Cloud Gateway
- Spring Cloud Netflix Eureka Client
- Reactive gateway routing (Spring Cloud)

## Core Logic
- Resolves backend services by logical name via Eureka (`lb://...`).
- Routes external paths to internal services:
  - identity-service routes (`/api/v1/auth/**`, `/api/v1/users/**`)
  - music-service routes (`/api/v1/songs/**`, `/api/v1/albums/**`, `/api/v1/genres/**`, `/api/v1/artists/**`, plus `/service-music/**`)
  - social-service route (`/api/v1/social/**`)
  - payment-service route (`/service-payment/**`)
- Applies configured `StripPrefix` filters on selected routes.

## API Documentation (Swagger & Postman)

### Direct service URL
- Gateway itself does not expose module-specific Swagger docs.
- Use each service's Swagger URL directly (see service READMEs).

### Gateway URL examples
- Identity: `http://localhost:8080/api/v1/auth/login`
- Music: `http://localhost:8080/api/v1/songs`
- Social: `http://localhost:8080/api/v1/social/...`

### JWT Bearer Token
Gateway forwards Authorization headers to downstream services.

```http
Authorization: Bearer <access_token>
```

## Testing Guide (Postman)

### A. Login through gateway
- Method: `POST`
- URL: `http://localhost:8080/api/v1/auth/login`
- Body example:

```json
{
  "email": "user1@example.com",
  "password": "StrongPass@123"
}
```

### B. Call protected endpoint via gateway
- Method: `GET`
- URL: `http://localhost:8080/api/v1/songs/my-songs`
- Header: `Authorization: Bearer <access_token>`

### C. Verify service discovery routing
- Stop one downstream service and confirm gateway returns an upstream/service-unavailable response.
