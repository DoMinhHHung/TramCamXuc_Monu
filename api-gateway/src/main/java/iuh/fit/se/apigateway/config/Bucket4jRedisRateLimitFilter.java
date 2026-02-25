package iuh.fit.se.apigateway.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.codec.ByteArrayCodec;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.codec.StringCodec;
import io.lettuce.core.api.StatefulRedisConnection;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Component
public class Bucket4jRedisRateLimitFilter implements GlobalFilter, Ordered {

    private final ProxyManager<String> proxyManager;
    private final Bandwidth limit;

    public Bucket4jRedisRateLimitFilter(
            @Value("${spring.data.redis.host}") String redisHost,
            @Value("${spring.data.redis.port}") int redisPort,
            @Value("${gateway.rate-limit.capacity:120}") long capacity,
            @Value("${gateway.rate-limit.refill-seconds:60}") long refillSeconds,
            @Value("${gateway.rate-limit.refill-tokens:120}") long refillTokens
    ) {
        RedisClient redisClient = RedisClient.create(RedisURI.Builder.redis(redisHost, redisPort).build());
        StatefulRedisConnection<String, byte[]> connection = redisClient.connect(RedisCodec.of(StringCodec.UTF8, ByteArrayCodec.INSTANCE));
        this.proxyManager = LettuceBasedProxyManager.builderFor(connection).build();
        this.limit = Bandwidth.classic(capacity, Refill.greedy(refillTokens, Duration.ofSeconds(refillSeconds)));
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String ip = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (ip == null || ip.isBlank()) {
            ip = exchange.getRequest().getRemoteAddress() != null
                    ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                    : "unknown";
        }

        String key = "gateway:ratelimit:" + ip;
        Bucket bucket = proxyManager.builder().build(key, () -> io.github.bucket4j.BucketConfiguration.builder().addLimit(limit).build());

        if (!bucket.tryConsume(1)) {
            exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            return exchange.getResponse().setComplete();
        }
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -30;
    }
}
