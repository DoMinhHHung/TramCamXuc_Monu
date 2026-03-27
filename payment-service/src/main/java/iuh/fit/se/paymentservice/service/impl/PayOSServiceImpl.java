package iuh.fit.se.paymentservice.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import iuh.fit.se.paymentservice.config.PayOSConfig;
import iuh.fit.se.paymentservice.config.RabbitMQConfig;
import iuh.fit.se.paymentservice.dto.request.PayOSWebhookRequest;
import iuh.fit.se.paymentservice.dto.response.PaymentResponse;
import iuh.fit.se.paymentservice.entity.PaymentTransaction;
import iuh.fit.se.paymentservice.entity.UserSubscription;
import iuh.fit.se.paymentservice.enums.PaymentMethod;
import iuh.fit.se.paymentservice.enums.PaymentStatus;
import iuh.fit.se.paymentservice.enums.SubscriptionStatus;
import iuh.fit.se.paymentservice.event.NotificationEvent;
import iuh.fit.se.paymentservice.event.SubscriptionActiveEvent;
import iuh.fit.se.paymentservice.exception.AppException;
import iuh.fit.se.paymentservice.exception.ErrorCode;
import iuh.fit.se.paymentservice.outbox.OutboxEvent;
import iuh.fit.se.paymentservice.outbox.OutboxEventRepository;
import iuh.fit.se.paymentservice.outbox.OutboxEventTypes;
import iuh.fit.se.paymentservice.repository.PaymentTransactionRepository;
import iuh.fit.se.paymentservice.repository.UserSubscriptionRepository;
import iuh.fit.se.paymentservice.service.PayOSService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.v2.paymentRequests.PaymentLink;
import vn.payos.model.v2.paymentRequests.PaymentLinkItem;
import vn.payos.model.webhooks.WebhookData;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayOSServiceImpl implements PayOSService {

    private final PayOS payOS;
    private final PayOSConfig payOSConfig;
    private final PaymentTransactionRepository transactionRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;
    private final OutboxEventRepository outboxEventRepository;
    private final SubscriptionAuthorizationCacheService subscriptionAuthorizationCacheService;

    // ──────────────────────────────────────────────────────────
    // CREATE PAYMENT LINK
    // ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public PaymentResponse createPaymentLink(UUID userId, String userEmail, UUID subscriptionId, String planName, BigDecimal amount, String description) {
        try {
            long orderCode      = generateOrderCode();
            String referenceCode = generateReferenceCode();

            PaymentTransaction transaction = PaymentTransaction.builder()
                    .userId(userId)
                    .userEmail(userEmail)
                    .subscription(subscriptionRepository.findById(subscriptionId).orElse(null))
                    .amount(amount)
                    .paymentMethod(PaymentMethod.PAYOS)
                    .status(PaymentStatus.PENDING)
                    .referenceCode(referenceCode)
                    .orderCode(orderCode)
                    .description(description)
                    .build();
            transaction = transactionRepository.save(transaction);

            List<PaymentLinkItem> items = List.of(
                    PaymentLinkItem.builder()
                            .name(planName)
                            .quantity(1)
                            .price(amount.longValue())
                            .build()
            );

            CreatePaymentLinkRequest paymentData = CreatePaymentLinkRequest.builder()
                    .orderCode(orderCode)
                    .amount(amount.longValue())
                    .description(description)
                    .items(items)
                    .returnUrl(payOSConfig.getReturnUrl())
                    .cancelUrl(payOSConfig.getCancelUrl())
                    .build();

            CreatePaymentLinkResponse checkoutResponse = payOS.paymentRequests().create(paymentData);

            transaction.setCheckoutUrl(checkoutResponse.getCheckoutUrl());
            transaction.setQrCode(checkoutResponse.getQrCode());
            transactionRepository.save(transaction);

            log.info("Created payment link for user={}, orderCode={}", userId, orderCode);

            return PaymentResponse.builder()
                    .checkoutUrl(checkoutResponse.getCheckoutUrl())
                    .qrCode(checkoutResponse.getQrCode())
                    .referenceCode(referenceCode)
                    .orderCode(orderCode)
                    .message("Payment link created successfully")
                    .build();

        } catch (Exception e) {
            log.error("Error creating payment link", e);
            throw new AppException(ErrorCode.PAYMENT_PROCESSING_ERROR);
        }
    }

    // ──────────────────────────────────────────────────────────
    // GET / CANCEL PAYMENT LINK
    // ──────────────────────────────────────────────────────────

    @Override
    public Object getPaymentLinkInformation(Long orderCode) {
        try {
            return payOS.paymentRequests().get(orderCode);
        } catch (Exception e) {
            log.error("Error getting payment link info for orderCode={}", orderCode, e);
            throw new AppException(ErrorCode.PAYMENT_TRANSACTION_NOT_FOUND);
        }
    }

    @Override
    @Transactional
    public Object cancelPaymentLink(Long orderCode, String reason) {
        try {
            PaymentTransaction transaction = transactionRepository.findByOrderCode(orderCode)
                    .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_TRANSACTION_NOT_FOUND));

            if (transaction.getStatus() != PaymentStatus.PENDING) {
                throw new AppException(ErrorCode.PAYMENT_PROCESSING_ERROR);
            }

            PaymentLink cancelled = payOS.paymentRequests().cancel(orderCode, reason);

            transaction.setStatus(PaymentStatus.CANCELLED);
            transactionRepository.save(transaction);

            if (transaction.getSubscription() != null) {
                UserSubscription sub = transaction.getSubscription();
                sub.setStatus(SubscriptionStatus.CANCELLED);
                subscriptionRepository.save(sub);
            }

            log.info("Cancelled payment link orderCode={}, reason={}", orderCode, reason);
            return cancelled;

        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error cancelling payment link orderCode={}", orderCode, e);
            throw new AppException(ErrorCode.PAYMENT_PROCESSING_ERROR);
        }
    }

    // ──────────────────────────────────────────────────────────
    // WEBHOOK HANDLER
    // ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void handleWebhook(PayOSWebhookRequest request) {
        try {
            log.info("Received PayOS webhook, verifying signature...");

            ObjectNode body = objectMapper.valueToTree(request);
            WebhookData data = payOS.webhooks().verify(body);

            Long orderCode = data.getOrderCode();
            log.info("Webhook verified, orderCode={}, code={}", orderCode, data.getCode());

            if (transactionRepository.findByOrderCode(orderCode).isEmpty()) {
                throw new RuntimeException("Transaction not found for orderCode=" + orderCode);
            }

            if ("00".equals(data.getCode())) {
                // Một lệnh UPDATE có điều kiện status=PENDING — idempotent khi webhook trùng / concurrent
                int updated = transactionRepository.updateFromPendingToCompleted(
                        orderCode,
                        PaymentStatus.COMPLETED,
                        data.getReference(),
                        PaymentStatus.PENDING);
                if (updated == 0) {
                    log.info("Payment success webhook skipped (not pending or duplicate) orderCode={}", orderCode);
                    return;
                }

                PaymentTransaction transaction = transactionRepository.findByOrderCode(orderCode)
                        .orElseThrow(() -> new RuntimeException("Transaction missing after claim orderCode=" + orderCode));

                if (transaction.getSubscription() != null) {
                    UserSubscription sub = transaction.getSubscription();
                    LocalDateTime activatedAt = LocalDateTime.now();
                    sub.setStatus(SubscriptionStatus.ACTIVE);
                    sub.setStartedAt(activatedAt);
                    sub.setExpiresAt(activatedAt.plusDays(sub.getPlan().getDurationDays()));
                    subscriptionRepository.save(sub);

                    subscriptionAuthorizationCacheService.cacheActiveSubscription(
                            transaction.getUserId(),
                            sub.getPlan().getFeatures(),
                            sub.getExpiresAt()
                    );

                    enqueueSubscriptionActiveEvent(transaction.getUserId(), sub);
                    enqueuePaymentSuccessEmail(transaction, sub);
                }

                log.info("Payment COMPLETED for orderCode={}", orderCode);

            } else {
                int updated = transactionRepository.updateFromPendingToFailed(
                        orderCode, PaymentStatus.FAILED, PaymentStatus.PENDING);
                if (updated == 0) {
                    log.info("Payment failure webhook skipped (not pending or duplicate) orderCode={}", orderCode);
                    return;
                }

                PaymentTransaction transaction = transactionRepository.findByOrderCode(orderCode)
                        .orElseThrow(() -> new RuntimeException("Transaction missing after fail claim orderCode=" + orderCode));

                if (transaction.getSubscription() != null) {
                    UserSubscription sub = transaction.getSubscription();
                    sub.setStatus(SubscriptionStatus.CANCELLED);
                    subscriptionRepository.save(sub);
                }

                log.warn("Payment FAILED for orderCode={}, code={}", orderCode, data.getCode());
            }

        } catch (Exception e) {
            log.error("Error handling PayOS webhook", e);
            throw new AppException(ErrorCode.PAYMENT_PROCESSING_ERROR);
        }
    }

    // ──────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ──────────────────────────────────────────────────────────

    /** Cùng transaction với save subscription — scheduler sẽ gửi RabbitMQ. */
    private void enqueueSubscriptionActiveEvent(UUID userId, UserSubscription sub) {
        try {
            SubscriptionActiveEvent evt = SubscriptionActiveEvent.builder()
                    .userId(userId)
                    .planName(sub.getPlan().getSubsName())
                    .features(sub.getPlan().getFeatures())
                    .build();
            outboxEventRepository.save(OutboxEvent.builder()
                    .aggregateType("Subscription")
                    .aggregateId(sub.getId().toString())
                    .eventType(OutboxEventTypes.SUBSCRIPTION_ACTIVATED)
                    .exchange(RabbitMQConfig.IDENTITY_EXCHANGE)
                    .routingKey(RabbitMQConfig.ROUTING_SUBSCRIPTION_ACTIVE)
                    .payload(objectMapper.writeValueAsString(evt))
                    .published(false)
                    .createdAt(Instant.now())
                    .build());
            log.info("Enqueued SubscriptionActiveEvent for userId={}, plan={}", userId, sub.getPlan().getSubsName());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize SubscriptionActiveEvent for outbox", e);
        }
    }

    private void enqueuePaymentSuccessEmail(PaymentTransaction transaction, UserSubscription sub) {
        try {
            String activatedAt = LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            String expiredAt   = sub.getExpiresAt()
                    .format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

            NotificationEvent evt = NotificationEvent.builder()
                    .channel("EMAIL")
                    .recipient(transaction.getUserEmail())
                    .subject("Thanh toán thành công - TramCamXuc")
                    .templateCode("payment-success")
                    .paramMap(Map.of(
                            "planName",    sub.getPlan().getSubsName(),
                            "amount",      transaction.getAmount().toPlainString() + " VNĐ",
                            "activatedAt", activatedAt,
                            "expiredAt",   expiredAt
                    ))
                    .build();
            outboxEventRepository.save(OutboxEvent.builder()
                    .aggregateType("PaymentTransaction")
                    .aggregateId(transaction.getId().toString())
                    .eventType(OutboxEventTypes.PAYMENT_SUCCESS_EMAIL)
                    .exchange(RabbitMQConfig.NOTIFICATION_EXCHANGE)
                    .routingKey(RabbitMQConfig.ROUTING_NOTIFICATION_EMAIL)
                    .payload(objectMapper.writeValueAsString(evt))
                    .published(false)
                    .createdAt(Instant.now())
                    .build());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize payment success NotificationEvent for outbox", e);
        }
    }

    private static final AtomicInteger counter = new AtomicInteger(0);

    private long generateOrderCode() {
        long timestamp = Instant.now().toEpochMilli() % 1_000_000_000L;
        int random = ThreadLocalRandom.current().nextInt(100, 999);
        return Long.parseLong(timestamp + "" + random);
    }

    private String generateReferenceCode() {
        return "REF" + System.currentTimeMillis()
                + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }
}
