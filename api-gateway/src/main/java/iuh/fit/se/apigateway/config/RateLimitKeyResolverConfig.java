package iuh.fit.se.apigateway.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Configuration
public class RateLimitKeyResolverConfig {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;

    public RateLimitKeyResolverConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Bean
    public KeyResolver jwtOrIpKeyResolver() {
        return exchange -> Mono.defer(() -> {
            String authorization = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            String userKey = resolveUserKeyFromAuthorization(authorization);

            if (StringUtils.hasText(userKey)) {
                return Mono.just(userKey);
            }

            return Mono.justOrEmpty(exchange.getRequest().getRemoteAddress())
                    .map(remoteAddress -> remoteAddress.getAddress().getHostAddress())
                    .filter(StringUtils::hasText)
                    .defaultIfEmpty("anonymous");
        });
    }

    private String resolveUserKeyFromAuthorization(String authorization) {
        if (!StringUtils.hasText(authorization) || !authorization.startsWith("Bearer ")) {
            return null;
        }

        String token = authorization.substring(7).trim();
        String[] parts = token.split("\\.");

        if (parts.length < 2) {
            return null;
        }

        try {
            byte[] payloadDecoded = Base64.getUrlDecoder().decode(parts[1]);
            String payloadJson = new String(payloadDecoded, StandardCharsets.UTF_8);
            Map<String, Object> claims = objectMapper.readValue(payloadJson, MAP_TYPE);

            Object userId = claims.get("userId");
            if (userId == null) {
                userId = claims.get("sub");
            }

            return userId == null ? null : String.valueOf(userId);
        } catch (Exception ex) {
            return null;
        }
    }
}
