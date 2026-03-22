package iuh.fit.se.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.security.Key;

@Component
@Slf4j
public class JwtAuthFilter implements GlobalFilter, Ordered {

    @Value("${jwt.signerKey:}")
    private String signerKey;

    private Key key;

    @PostConstruct
    public void init() {
        if (StringUtils.hasText(signerKey)) {
            this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(signerKey));
        }
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ") && key != null) {
            String token = authHeader.substring(7);
            try {
                Claims claims = Jwts.parserBuilder()
                        .setSigningKey(key)
                        .build()
                        .parseClaimsJws(token)
                        .getBody();

                String userId = claims.getSubject();
                String role = claims.get("role", String.class);
                String email = claims.get("email", String.class);

                ServerWebExchange mutated = exchange.mutate()
                        .request(r -> r
                                .headers(headers -> {
                                    headers.remove("X-User-Id");
                                    headers.remove("X-User-Role");
                                    headers.remove("X-User-Email");
                                    headers.remove("X-Internal-Source");
                                    headers.header("X-User-Id", userId != null ? userId : "");
                                    headers.header("X-User-Role", role != null ? role : "");
                                    headers.header("X-User-Email", email != null ? email : "");
                                    headers.header("X-Internal-Source", "gateway");
                                }))
                        .build();

                exchange.getAttributes().put("X-User-Id", userId);
                return chain.filter(mutated);
            } catch (ExpiredJwtException e) {
                log.warn("[GW-Auth] Token expired");
                return unauthorized(exchange);
            } catch (Exception e) {
                log.warn("[GW-Auth] Invalid token: {}", e.getMessage());
                return unauthorized(exchange);
            }
        }

        return chain.filter(exchange);
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
