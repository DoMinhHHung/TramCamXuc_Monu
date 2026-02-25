package iuh.fit.se.payment.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import iuh.fit.se.core.configuration.RabbitMQConfig;
import iuh.fit.se.core.dto.message.SubscriptionUpgradeRequestedEvent;
import iuh.fit.se.core.event.SubscriptionActiveEvent;
import iuh.fit.se.core.exception.AppException;
import iuh.fit.se.core.exception.ErrorCode;
import iuh.fit.se.payment.configuration.PayOSConfig;
import iuh.fit.se.payment.dto.request.PayOSWebhookRequest;
import iuh.fit.se.payment.dto.response.PaymentResponse;
import iuh.fit.se.payment.entity.PaymentTransaction;
import iuh.fit.se.payment.entity.UserSubscription;
import iuh.fit.se.payment.enums.PaymentMethod;
import iuh.fit.se.payment.enums.PaymentStatus;
import iuh.fit.se.payment.enums.SubscriptionStatus;
import iuh.fit.se.payment.repository.PaymentTransactionRepository;
import iuh.fit.se.payment.repository.UserSubscriptionRepository;
import iuh.fit.se.payment.service.PayOSService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.ApplicationEventPublisher;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@Service
@Slf4j
public class PayOSServiceImpl implements PayOSService {
    private final PayOS payOS;
    private final PayOSConfig payOSConfig;
    private final PaymentTransactionRepository transactionRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;

    private final ApplicationEventPublisher eventPublisher;
    private final RabbitTemplate rabbitTemplate;

    @Override
    @Transactional
    public PaymentResponse createPaymentLink(UUID userId, UUID subscriptionId, String planName, BigDecimal amount, String description) {
        try{
            long orderCode = generateOrderCode();
            String referenceCode = generateReferenceCode();

            PaymentTransaction transaction = PaymentTransaction.builder()
                    .userId(userId)
                    .subscription(subscriptionRepository.findById(subscriptionId).orElse(null))
                    .amount(amount)
                    .paymentMethod(PaymentMethod.PAYOS)
                    .status(PaymentStatus.PENDING)
                    .referenceCode(referenceCode)
                    .orderCode(orderCode)
                    .description(description)
                    .build();

            transaction = transactionRepository.save(transaction);

            List<PaymentLinkItem> items = new ArrayList<>();
            PaymentLinkItem item = PaymentLinkItem.builder()
                    .name(planName)
                    .quantity(1)
                    .price(amount.longValue())
                    .build();
            items.add(item);

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

    @Override
    public Object getPaymentLinkInformation(Long orderCode) {
        try {
            PaymentLink paymentLink = payOS.paymentRequests().get(orderCode);
            return paymentLink;
        } catch (Exception e) {
            log.error("Error getting payment link info: {}", e.getMessage(), e);
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

            PaymentLink cancelledPayment = payOS.paymentRequests().cancel(orderCode, reason);

            transaction.setStatus(PaymentStatus.CANCELLED);
            transactionRepository.save(transaction);

            if (transaction.getSubscription() != null) {
                UserSubscription subscription = transaction.getSubscription();
                subscription.setStatus(SubscriptionStatus.CANCELLED);
                subscriptionRepository.save(subscription);
            }

            log.info("Cancelled payment link: {}", orderCode);

            return cancelledPayment;

        } catch (Exception e) {
            log.error("Error cancelling payment link: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.PAYMENT_PROCESSING_ERROR);
        }
    }

    @Override
    @Transactional
    public void handleWebhook(PayOSWebhookRequest webhookRequest) {
        try {
            log.info("Processing webhook: {}", webhookRequest);

            // Verify webhook signature
            ObjectNode body = objectMapper.valueToTree(webhookRequest);
            WebhookData data = payOS.webhooks().verify(body);

            Long orderCode = data.getOrderCode();
            PaymentTransaction transaction = transactionRepository.findByOrderCode(orderCode)
                    .orElseThrow(() -> new RuntimeException("Transaction not found"));

            String webhookCode = data.getCode();

            if ("00".equals(webhookCode)) {
                transaction.setStatus(PaymentStatus.COMPLETED);
                transaction.setProviderTransactionId(data.getReference());

                // Activate subscription
                if (transaction.getSubscription() != null) {
                    UserSubscription subscription = transaction.getSubscription();
                    subscription.setStatus(SubscriptionStatus.ACTIVE);
                    subscriptionRepository.save(subscription);
                    log.info("Activated subscription: {}", subscription.getId());

                    eventPublisher.publishEvent(SubscriptionActiveEvent.builder()
                            .userId(transaction.getUserId())
                            .planName(subscription.getPlan().getSubsName())
                            .features(subscription.getPlan().getFeatures())
                            .build());

                    rabbitTemplate.convertAndSend(
                            RabbitMQConfig.BILLING_EXCHANGE,
                            RabbitMQConfig.SUBSCRIPTION_UPGRADE_REQUESTED_ROUTING_KEY,
                            SubscriptionUpgradeRequestedEvent.builder()
                                    .userId(transaction.getUserId())
                                    .subscriptionId(subscription.getId())
                                    .transactionId(transaction.getId())
                                    .planName(subscription.getPlan().getSubsName())
                                    .features(subscription.getPlan().getFeatures())
                                    .build()
                    );
                }

                log.info("Payment completed for order: {}", orderCode);

            } else {
                transaction.setStatus(PaymentStatus.FAILED);
                if (transaction.getSubscription() != null) {
                    UserSubscription subscription = transaction.getSubscription();
                    subscription.setStatus(SubscriptionStatus.CANCELLED);
                    subscriptionRepository.save(subscription);
                    log.info("Cancelled subscription: {}", subscription.getId());
                }

                log.warn("Payment failed for order: {}. Code: {}, Desc: {}",
                        orderCode, webhookCode, webhookRequest.getDesc());
            }

            transactionRepository.save(transaction);
            log.info("Transaction updated successfully: {}", transaction.getId());

        } catch (Exception e) {
            log.error("Error handling webhook: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.PAYMENT_PROCESSING_ERROR);
        }
    }

    private long generateOrderCode() {
        return Math.abs(Instant.now().toEpochMilli());
    }

    private String generateReferenceCode() {
        return "REF" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }
}
