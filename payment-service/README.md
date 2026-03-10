# payment-service

## Introduction
`payment-service` handles subscription billing workflows for PhazelSound, including plan management, purchase flow, PayOS webhook processing, subscription status tracking, and event publication to other services.

## Tech Stack
- Spring Boot 3
- Spring Web + Validation
- Spring Data JPA + PostgreSQL
- Spring Security (JWT resource server)
- Spring AMQP (RabbitMQ events)
- Eureka Client
- OpenAPI/Swagger (springdoc)
- PayOS integration

## Core Logic

### 1) Subscription purchase flow
1. User requests purchase via `POST /subscriptions/purchase`.
2. Service creates payment transaction and PayOS payment link.
3. PayOS sends callback to `/payments/payos_transfer_handler` (public webhook).
4. On successful payment, subscription is activated and user subscription data is persisted.
5. Service publishes `subscription.active` event to `identity.exchange` for identity synchronization.

### 2) Plan administration flow
- Admin manages plans via `/admin/subscriptions/plans` endpoints (create, update, toggle status, delete).
- Public users can read active plans via `GET /subscriptions/plans`.

### 3) Event-driven integration
- Publishes to:
  - `identity.exchange` (`subscription.active`)
  - `config.exchange` (`config.free-plan`)
  - `notification.exchange` (`notification.email`)

## API Documentation (Swagger & Postman)

### Direct service URL
- Swagger UI: `http://localhost:8084/swagger-ui/index.html`
- OpenAPI JSON: `http://localhost:8084/v3/api-docs`

### Gateway URL
- Configured payment route: `http://localhost:8080/service-payment/...`

### JWT Bearer Token
For protected endpoints (except webhook and public plan list), include:

```http
Authorization: Bearer <access_token>
```

In Postman:
1. Authorization tab -> Bearer Token.
2. Paste access token from identity-service login.

## Testing Guide (Postman)

### A. Get active plans (public)
- Method: `GET`
- URL (direct): `http://localhost:8084/subscriptions/plans`

### B. Purchase subscription (authenticated)
- Method: `POST`
- URL: `http://localhost:8084/subscriptions/purchase`
- Header: `Authorization: Bearer <user_token>`
- Body example:

```json
{
  "planId": "5bca7ddf-9b18-41b0-bb97-5bbf86f8fc2c"
}
```

### C. Handle PayOS webhook (public callback)
- Method: `POST`
- URL: `http://localhost:8084/payments/payos_transfer_handler`
- Body example:

```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": {
    "orderCode": 123456789,
    "amount": 99000,
    "description": "SUBSCRIPTION_PURCHASE"
  },
  "signature": "<payos-signature>"
}
```

### D. Admin create subscription plan
- Method: `POST`
- URL: `http://localhost:8084/admin/subscriptions/plans`
- Header: `Authorization: Bearer <admin_token>`
- Body example:

```json
{
  "name": "Premium Monthly",
  "description": "Monthly premium access",
  "price": 99000,
  "durationDays": 30,
  "active": true
}
```

### E. Check current user subscription
- Method: `GET`
- URL: `http://localhost:8084/subscriptions/my`
- Header: `Authorization: Bearer <user_token>`
