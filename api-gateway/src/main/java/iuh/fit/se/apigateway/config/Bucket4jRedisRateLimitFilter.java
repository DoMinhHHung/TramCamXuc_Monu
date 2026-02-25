package iuh.fit.se.apigateway.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.codec.StringCodec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

@Component
public class Bucket4jRedisRateLimitFilter implements GlobalFilter, Ordered {

    private final ProxyManager<String> proxyManager;
    private final Bandwidth limit;
    private final String machineIdHeader;

    public Bucket4jRedisRateLimitFilter(
            @Value("${spring.data.redis.host}") String redisHost,
            @Value("${spring.data.redis.port}") int redisPort,
            @Value("${gateway.rate-limit.capacity:120}") long capacity,
            @Value("${gateway.rate-limit.refill-seconds:60}") long refillSeconds,
            @Value("${gateway.rate-limit.refill-tokens:120}") long refillTokens,
            @Value("${gateway.rate-limit.machine-id-header:X-Device-Id}") String machineIdHeader
    ) {
        RedisClient redisClient = RedisClient.create(RedisURI.Builder.redis(redisHost, redisPort).build());
        StatefulRedisConnection<String, byte[]> connection = redisClient.connect(RedisCodec.of(StringCodec.UTF8, ByteArrayCodec.INSTANCE));
        this.proxyManager = LettuceBasedProxyManager.builderFor(connection).build();
        this.limit = Bandwidth.classic(capacity, Refill.greedy(refillTokens, Duration.ofSeconds(refillSeconds)));
        this.machineIdHeader = machineIdHeader;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String key = resolveRateLimitKey(exchange);
        Bucket bucket = proxyManager.builder()
                .build(key, () -> io.github.bucket4j.BucketConfiguration.builder().addLimit(limit).build());

        if (!bucket.tryConsume(1)) {
            exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            return exchange.getResponse().setComplete();
        }
        return chain.filter(exchange);
    }

    private String resolveRateLimitKey(ServerWebExchange exchange) {
        String authorization = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        // Authenticated requests: keep strict per-client IP throttling.
        if (authorization != null && authorization.startsWith("Bearer ")) {
            return "gateway:ratelimit:auth:" + resolveClientIp(exchange);
        }

        // Unauthenticated requests: prefer machine id header to avoid throttling whole WiFi NAT.
        String machineId = exchange.getRequest().getHeaders().getFirst(machineIdHeader);
        if (machineId != null && !machineId.isBlank()) {
            return "gateway:ratelimit:anon:machine:" + machineId.trim();
        }

        String ip = resolveClientIp(exchange);
        String userAgent = exchange.getRequest().getHeaders().getFirst(HttpHeaders.USER_AGENT);
        String uaFingerprint = userAgent == null ? "na"
                : Base64.getUrlEncoder().withoutPadding().encodeToString(userAgent.getBytes(StandardCharsets.UTF_8));

        return "gateway:ratelimit:anon:ipua:" + ip + ":" + uaFingerprint;
    }

    private String resolveClientIp(ServerWebExchange exchange) {
        String ip = exchange.getRequest().getHeaders().getFirst("CF-Connecting-IP");
        if (ip != null && !ip.isBlank()) return ip.trim();

        ip = exchange.getRequest().getHeaders().getFirst("X-Real-IP");
        if (ip != null && !ip.isBlank()) return ip.trim();

        ip = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (ip != null && !ip.isBlank()) {
            return ip.split(",")[0].trim();
        }

        return exchange.getRequest().getRemoteAddress() != null
                ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                : "unknown";
    }

    @Override
    public int getOrder() {
        return -30;
    }
}
