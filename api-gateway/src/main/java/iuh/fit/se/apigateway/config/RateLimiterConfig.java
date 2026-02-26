package iuh.fit.se.apigateway.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Configuration
public class RateLimiterConfig {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;

    public RateLimiterConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Bean
    public KeyResolver jwtOrIpKeyResolver() {
        return exchange -> Mono.justOrEmpty(extractBearerToken(exchange))
                .flatMap(this::extractUserKeyFromJwt)
                .switchIfEmpty(Mono.fromSupplier(() -> resolveClientIp(exchange)));
    }

    private String extractBearerToken(ServerWebExchange exchange) {
        String authorization = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(authorization) || !authorization.startsWith("Bearer ")) {
            return null;
        }

        String token = authorization.substring(7).trim();
        return StringUtils.hasText(token) ? token : null;
    }

    private Mono<String> extractUserKeyFromJwt(String token) {
        try {
            String[] jwtParts = token.split("\\.");
            if (jwtParts.length < 2) {
                return Mono.empty();
            }

            byte[] payloadBytes = Base64.getUrlDecoder().decode(jwtParts[1]);
            String payloadJson = new String(payloadBytes, StandardCharsets.UTF_8);
            Map<String, Object> claims = objectMapper.readValue(payloadJson, MAP_TYPE);

            Object userId = claims.get("userId");
            Object subject = claims.get("sub");
            String principal = userId != null ? String.valueOf(userId) : (subject != null ? String.valueOf(subject) : null);

            return StringUtils.hasText(principal) ? Mono.just(principal) : Mono.empty();
        } catch (Exception ignored) {
            return Mono.empty();
        }
    }

    private String resolveClientIp(ServerWebExchange exchange) {
        String xForwardedFor = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (StringUtils.hasText(xForwardedFor)) {
            String firstForwardedIp = xForwardedFor.split(",")[0].trim();
            if (StringUtils.hasText(firstForwardedIp)) {
                return firstForwardedIp;
            }
        }

        if (exchange.getRequest().getRemoteAddress() != null
                && exchange.getRequest().getRemoteAddress().getAddress() != null
                && StringUtils.hasText(exchange.getRequest().getRemoteAddress().getAddress().getHostAddress())) {
            return exchange.getRequest().getRemoteAddress().getAddress().getHostAddress();
        }

        return "anonymous";
    }
}
