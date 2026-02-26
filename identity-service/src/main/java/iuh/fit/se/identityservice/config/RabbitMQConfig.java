package iuh.fit.se.identityservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // ── Exchanges ──────────────────────────────────────────────
    public static final String NOTIFICATION_EXCHANGE = "notification.exchange";
    public static final String IDENTITY_EXCHANGE     = "identity.exchange";
    public static final String CONFIG_EXCHANGE       = "config.exchange";

    // ── Queues ─────────────────────────────────────────────────
    /** Nhận event subscription đã active từ payment-service */
    public static final String IDENTITY_SUBSCRIPTION_QUEUE = "identity.subscription.queue";

    /** Nhận free plan config từ payment-service khi startup */
    public static final String IDENTITY_FREE_PLAN_QUEUE = "identity.free-plan.queue";

    /** Nhận event artist đã đăng ký để upgrade role */
    public static final String IDENTITY_ARTIST_QUEUE = "identity.artist-registered.queue";

    // ── Routing keys ───────────────────────────────────────────
    public static final String ROUTING_SUBSCRIPTION_ACTIVE  = "subscription.active";
    public static final String ROUTING_FREE_PLAN_RESPONSE   = "config.free-plan";
    public static final String ROUTING_ARTIST_REGISTERED    = "artist.registered";
    public static final String ROUTING_NOTIFICATION_EMAIL   = "notification.email";

    // ── Message converter ──────────────────────────────────────
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    // ── Exchanges ──────────────────────────────────────────────
    @Bean
    public TopicExchange notificationExchange() {
        return new TopicExchange(NOTIFICATION_EXCHANGE);
    }

    @Bean
    public TopicExchange identityExchange() {
        return new TopicExchange(IDENTITY_EXCHANGE);
    }

    @Bean
    public TopicExchange configExchange() {
        return new TopicExchange(CONFIG_EXCHANGE);
    }

    // ── Queues ─────────────────────────────────────────────────
    @Bean
    public Queue identitySubscriptionQueue() {
        return QueueBuilder.durable(IDENTITY_SUBSCRIPTION_QUEUE).build();
    }

    @Bean
    public Queue identityFreePlanQueue() {
        return QueueBuilder.durable(IDENTITY_FREE_PLAN_QUEUE).build();
    }

    @Bean
    public Queue identityArtistQueue() {
        return QueueBuilder.durable(IDENTITY_ARTIST_QUEUE).build();
    }

    // ── Bindings ───────────────────────────────────────────────
    @Bean
    public Binding bindSubscription(Queue identitySubscriptionQueue,
                                    TopicExchange identityExchange) {
        return BindingBuilder.bind(identitySubscriptionQueue)
                .to(identityExchange).with(ROUTING_SUBSCRIPTION_ACTIVE);
    }

    @Bean
    public Binding bindFreePlan(Queue identityFreePlanQueue,
                                TopicExchange configExchange) {
        return BindingBuilder.bind(identityFreePlanQueue)
                .to(configExchange).with(ROUTING_FREE_PLAN_RESPONSE);
    }

    @Bean
    public Binding bindArtist(Queue identityArtistQueue,
                              TopicExchange identityExchange) {
        return BindingBuilder.bind(identityArtistQueue)
                .to(identityExchange).with(ROUTING_ARTIST_REGISTERED);
    }
}