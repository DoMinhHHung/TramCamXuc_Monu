package iuh.fit.se.paymentservice.outbox;

/**
 * Payload type discriminator for {@link OutboxEvent} deserialization in {@link OutboxPublisherService}.
 */
public final class OutboxEventTypes {

    private OutboxEventTypes() {}

    public static final String SUBSCRIPTION_ACTIVATED = "SubscriptionActivated";
    public static final String PAYMENT_SUCCESS_EMAIL = "PaymentSuccessEmail";
    public static final String FREE_PLAN_BROADCAST = "FreePlanBroadcast";
}
