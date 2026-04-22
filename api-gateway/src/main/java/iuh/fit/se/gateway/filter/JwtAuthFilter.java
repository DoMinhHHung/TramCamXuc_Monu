package iuh.fit.se.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Component
@Slf4j
public class JwtAuthFilter implements GlobalFilter, Ordered {

    @Value("${jwt.signerKey:}")
    private String signerKey;

    @Value("${gateway.internal-secret:}")
    private String gatewayInternalSecret;

    private final ReactiveStringRedisTemplate reactiveRedisTemplate;

    private Key key;

    public JwtAuthFilter(ReactiveStringRedisTemplate reactiveRedisTemplate) {
        this.reactiveRedisTemplate = reactiveRedisTemplate;
    }

    @PostConstruct
    public void init() {
        if (StringUtils.hasText(signerKey)) {
            this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(signerKey));
        } else {
            log.error("JWT_SECRET chưa được cấu hình!");
        }
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String authHeader = exchange.getRequest()
                .getHeaders()
                .getFirst(HttpHeaders.AUTHORIZATION);

        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            return chain.filter(exchange);
        }

        if (key == null) {
            log.error("JWT key chưa được khởi tạo");
            return respondUnauthorized(exchange, "Server configuration error");
        }

        String token = authHeader.substring(7);

        Claims claims;
        try {
            claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (ExpiredJwtException e) {
            log.warn("[GW-JWT] Token expired: {}", e.getMessage());
            return respondUnauthorized(exchange, "Token expired");
        } catch (SignatureException e) {
            log.warn("[GW-JWT] Invalid signature: {}", e.getMessage());
            return respondUnauthorized(exchange, "Invalid token signature");
        } catch (MalformedJwtException e) {
            log.warn("[GW-JWT] Malformed token: {}", e.getMessage());
            return respondUnauthorized(exchange, "Malformed token");
        } catch (Exception e) {
            log.error("[GW-JWT] Unexpected error: {}", e.getMessage());
            return respondUnauthorized(exchange, "Authentication failed");
        }

        String userId = claims.getSubject();
        String role   = claims.get("role",  String.class);
        String email  = claims.get("email", String.class);

        if (!StringUtils.hasText(userId)) {
            return respondUnauthorized(exchange, "Invalid token: missing subject");
        }

        // Kiểm tra blacklist (token đã bị logout) — nếu Redis lỗi thì cho qua (fail-open)
        String blacklistKey = "auth:blacklist:" + sha256Hex(token);
        return reactiveRedisTemplate.hasKey(blacklistKey)
                .onErrorReturn(false)
                .flatMap(isBlacklisted -> {
                    if (Boolean.TRUE.equals(isBlacklisted)) {
                        log.warn("[GW-JWT] Token revoked for userId={}", userId);
                        return respondUnauthorized(exchange, "Token has been revoked");
                    }

                    ServerWebExchange mutatedExchange = exchange.mutate()
                            .request(r -> r
                                    .header("X-User-Id",       userId)
                                    .header("X-User-Role",     role  != null ? role  : "")
                                    .header("X-User-Email",    email != null ? email : "")
                                    .header("X-Authenticated", "true")
                                    .header("X-Gateway-Secret", gatewayInternalSecret)
                            )
                            .build();

                    exchange.getAttributes().put("X-User-Id", userId);
                    log.debug("[GW-JWT] Authenticated userId={} role={}", userId, role);
                    return chain.filter(mutatedExchange);
                });
    }

    private Mono<Void> respondUnauthorized(ServerWebExchange exchange, String message) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        byte[] bytes = String.format("{\"code\":9997,\"message\":\"%s\"}", message)
                .getBytes(StandardCharsets.UTF_8);
        return exchange.getResponse()
                .writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(bytes)));
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
