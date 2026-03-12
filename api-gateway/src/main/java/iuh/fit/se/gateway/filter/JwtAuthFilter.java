package iuh.fit.se.gateway.filter;

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
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import jakarta.annotation.PostConstruct; // Nhớ check version Spring Boot xem dùng javax hay jakarta nhé
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

                exchange.getAttributes().put("X-User-Id", userId);
                ServerWebExchange mutated = exchange.mutate()
                        .request(r -> r.header("X-User-Id", userId))
                        .build();
                return chain.filter(mutated);

            } catch (Exception ex) {
                log.error("[GW-Auth] Invalid Token: {}", ex.getMessage());
            }
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}