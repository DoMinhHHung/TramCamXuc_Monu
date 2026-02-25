# Payment & Subscription Saga (Choreography)

## 1) Saga steps

1. PayOS webhook -> `payment-service` marks transaction `COMPLETED`.
2. `payment-service` publishes `SubscriptionUpgradeRequestedEvent` to RabbitMQ (`billing.event.exchange`).
3. `identity-service` consumes event, updates user plan in DB + Redis profile cache.
4. `identity-service` publishes `SubscriptionProvisionedEvent` (success/failure).
5. `integration-service` consumes provisioned event and sends email result.

## 2) Consistency model

- Eventual consistency (not distributed transaction).
- Each step idempotent by `transactionId` / `subscriptionId`.
- Failures go to retry or DLQ, then reconciliation job.

## 3) Rollback / fallback

- If Identity provisioning fails:
  - emit `SubscriptionProvisionedEvent(success=false)`
  - alert + retry policy
  - optional compensation: mark payment for manual review/refund queue
- If Email fails:
  - retry via queue; provisioning state remains success.

## 4) JWT and premium update without re-login

Không cần user login lại.

- JWT chỉ chứa immutable claim (`userId`, `email`).
- Role/Plan nằm trong Redis key: `user:profile:{userId}`.
- Gateway validate JWT -> lấy `userId` -> lookup Redis -> inject headers:
  - `X-User-Id`
  - `X-User-Role`
  - `X-User-Plan`

Khi payment success:
- Identity update DB + update Redis profile ngay.
- Request kế tiếp của user dùng token cũ vẫn nhận quyền PREMIUM realtime qua header từ Gateway.
