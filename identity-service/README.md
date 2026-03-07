# identity-service

## Introduction
`identity-service` provides authentication, token management, user profile APIs, OTP verification, and internal role/subscription synchronization.

## Tech Stack
- Spring Boot 3
- Spring Web + Validation
- Spring Data JPA + PostgreSQL
- Spring Data Redis
- Spring Security + JWT
- Spring AMQP (identity/subscription events)
- Cloudinary (avatar upload)
- OpenAPI/Swagger (springdoc)

## Core Logic

### 1) Auth lifecycle
- Registration -> OTP verification -> login -> JWT access/refresh.
- Password reset via OTP.
- Social login token exchange endpoint.

### 2) Event-driven identity synchronization
- Consume `subscription.active` to sync user subscription state.
- Consume `artist.registered` to grant artist role/authority.
- Consume `config.free-plan` for startup/default subscription config.

## API Documentation (Swagger & Postman)

### Direct service URL
- Swagger UI: `http://localhost:8081/swagger-ui/index.html`
- OpenAPI JSON: `http://localhost:8081/v3/api-docs`

### Gateway URL examples
- Auth route (configured): `http://localhost:8080/api/v1/auth/...`
- User route (configured): `http://localhost:8080/api/v1/users/...`
- Direct controller base paths are `/auth` and `/users`.

### JWT Bearer Token
For protected user endpoints:

```http
Authorization: Bearer <access_token>
```

## Testing Guide (Postman)

### A. Register
- Method: `POST`
- URL (direct): `http://localhost:8081/auth/registration`
- Body example:

```json
{
  "email": "user1@example.com",
  "password": "StrongPass@123",
  "firstName": "User",
  "lastName": "One"
}
```

### B. Verify OTP
- Method: `POST`
- URL: `http://localhost:8081/auth/verify`
- Body example:

```json
{
  "email": "user1@example.com",
  "otp": "123456"
}
```

### C. Login
- Method: `POST`
- URL: `http://localhost:8081/auth/login`
- Body example:

```json
{
  "email": "user1@example.com",
  "password": "StrongPass@123"
}
```

### D. Get profile (protected)
- Method: `GET`
- URL: `http://localhost:8081/users/my-profile`
- Header: `Authorization: Bearer <access_token>`
