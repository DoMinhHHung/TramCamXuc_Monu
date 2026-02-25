package iuh.fit.se.apigateway.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
@Slf4j
public class JwtHeaderEnrichmentFilter implements GlobalFilter, Ordered {

    private final SecretKey signingKey;
    private final ReactiveStringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public JwtHeaderEnrichmentFilter(
            @Value("${jwt.signerKey}") String signerKey,
            ReactiveStringRedisTemplate redisTemplate,
            ObjectMapper objectMapper
    ) {
        this.signingKey = buildSigningKey(signerKey);
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    private SecretKey buildSigningKey(String signerKey) {
        try {
            byte[] decoded = Decoders.BASE64.decode(signerKey);
            return Keys.hmacShaKeyFor(decoded);
        } catch (Exception ex) {
            log.warn("jwt.signerKey is not valid Base64, fallback to raw UTF-8 bytes for local bootstrap");
            byte[] raw = signerKey.getBytes(StandardCharsets.UTF_8);
            byte[] keyBytes = new byte[32];
            for (int i = 0; i < keyBytes.length; i++) {
                keyBytes[i] = i < raw.length ? raw[i] : (byte) '0';
            }
            return Keys.hmacShaKeyFor(keyBytes);
        }
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (path.startsWith("/api/v1/identity/auth")) {
            return chain.filter(exchange);
        }

        String authorization = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return chain.filter(exchange);
        }

        String token = authorization.substring(7);
        final String userId;
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(signingKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            userId = claims.getSubject();
        } catch (Exception ex) {
            log.warn("JWT validation failed at gateway: {}", ex.getMessage());
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String cacheKey = "user:profile:" + userId;
        return redisTemplate.opsForValue().get(cacheKey)
                .flatMap(raw -> enrichAndForward(exchange, chain, userId, raw))
                .switchIfEmpty(enrichAndForward(exchange, chain, userId, null));
    }

    private Mono<Void> enrichAndForward(ServerWebExchange exchange,
                                        GatewayFilterChain chain,
                                        String userId,
                                        String profileJson) {
        String role = "ROLE_USER";
        String plan = "FREE";

        if (profileJson != null && !profileJson.isBlank()) {
            try {
                Map<String, String> profile = objectMapper.readValue(profileJson, new TypeReference<>() {
                });
                role = profile.getOrDefault("role", role);
                plan = profile.getOrDefault("plan", plan);
            } catch (Exception e) {
                log.warn("Cannot parse user profile cache for user {}", userId);
            }
        }

        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header("X-User-Id", userId)
                .header("X-User-Role", role)
                .header("X-User-Plan", plan)
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    @Override
    public int getOrder() {
        return -20;
    }
}
