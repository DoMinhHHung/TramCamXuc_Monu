package iuh.fit.se.gateway;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.security.Key;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Component
@Slf4j
public class RequestAuditLoggingFilter implements GlobalFilter, Ordered {

    @Value("${jwt.signerKey:}")
    private String signerKey;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, org.springframework.cloud.gateway.filter.GatewayFilterChain chain) {
        Instant startedAt = Instant.now();

        String method = exchange.getRequest().getMethod() != null
                ? exchange.getRequest().getMethod().name()
                : "UNKNOWN";
        String path = exchange.getRequest().getURI().getPath();
        String query = exchange.getRequest().getURI().getQuery();
        String ip = extractClientIp(exchange);
        String userId = extractUserId(exchange).orElse("anonymous");
        String userAgent = exchange.getRequest().getHeaders().getFirst(HttpHeaders.USER_AGENT);
        String platform = exchange.getRequest().getHeaders().getFirst("X-Platform");
        String appVersion = exchange.getRequest().getHeaders().getFirst("X-App-Version");
        String routeId = Optional.ofNullable(exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR))
                .map(Route::getId)
                .orElse("pending-route");

        log.info("[GW-IN] method={} path={} query={} route={} ip={} userId={} userAgent='{}' platform={} appVersion={}",
                method,
                path,
                query,
                routeId,
                ip,
                userId,
                userAgent,
                platform,
                appVersion);

        return chain.filter(exchange).doFinally(signalType -> {
            long durationMs = Duration.between(startedAt, Instant.now()).toMillis();
            Integer status = exchange.getResponse().getStatusCode() != null
                    ? exchange.getResponse().getStatusCode().value()
                    : null;

            String finalRouteId = Optional.ofNullable(exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR))
                    .map(Route::getId)
                    .orElse("unknown-route");

            if (status != null && status == 429) {
                log.warn("[GW-OUT] method={} path={} route={} ip={} userId={} status={} durationMs={} reason=RATE_LIMITED",
                        method, path, finalRouteId, ip, userId, status, durationMs);
                return;
            }

            log.info("[GW-OUT] method={} path={} route={} ip={} userId={} status={} durationMs={}",
                    method, path, finalRouteId, ip, userId, status, durationMs);
        });
    }

    @Override
    public int getOrder() {
        return -1;
    }

    private String extractClientIp(ServerWebExchange exchange) {
        String forwardedFor = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            return forwardedFor.split(",")[0].trim();
        }

        InetSocketAddress remoteAddress = exchange.getRequest().getRemoteAddress();
        return remoteAddress != null ? remoteAddress.getAddress().getHostAddress() : "unknown-ip";
    }

    private Optional<String> extractUserId(ServerWebExchange exchange) {
        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            return Optional.empty();
        }

        String token = authHeader.substring(7);
        if (!StringUtils.hasText(signerKey)) {
            return Optional.empty();
        }

        try {
            Key key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(signerKey));
            Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
            return Optional.ofNullable(claims.getSubject());
        } catch (Exception ex) {
            return Optional.empty();
        }
    }
}
