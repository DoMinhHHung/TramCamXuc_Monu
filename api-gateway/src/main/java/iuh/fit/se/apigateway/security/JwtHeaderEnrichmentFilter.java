package iuh.fit.se.apigateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;

@Component
@Slf4j
public class JwtHeaderEnrichmentFilter implements GlobalFilter, Ordered {

    private final SecretKey signingKey;

    public JwtHeaderEnrichmentFilter(@Value("${jwt.signerKey}") String signerKey) {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(signerKey));
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
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(signingKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            String userId = claims.getSubject();
            String role = claims.get("role", String.class);

            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                    .header("X-User-Id", userId)
                    .header("X-User-Role", role == null ? "" : role)
                    .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        } catch (Exception ex) {
            log.warn("JWT validation failed at gateway: {}", ex.getMessage());
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }

    @Override
    public int getOrder() {
        return -20;
    }
}
