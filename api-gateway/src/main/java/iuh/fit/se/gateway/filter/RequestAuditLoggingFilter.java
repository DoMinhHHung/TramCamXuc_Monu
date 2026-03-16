package iuh.fit.se.gateway.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Component
@Slf4j
public class RequestAuditLoggingFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        Instant startedAt = Instant.now();

        String method = exchange.getRequest().getMethod() != null ? exchange.getRequest().getMethod().name() : "UNKNOWN";
        String path = exchange.getRequest().getURI().getPath();
        String ip = extractClientIp(exchange);

        String userId = Optional.ofNullable((String) exchange.getAttribute("X-User-Id")).orElse("anonymous");

        String routeId = Optional.ofNullable(exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR))
                .map(route -> ((Route) route).getId())
                .orElse("pending-route");

        log.info("[GW-IN] method={} path={} route={} ip={} userId={}", method, path, routeId, ip, userId);

        return chain.filter(exchange).doFinally(signalType -> {
            long durationMs = Duration.between(startedAt, Instant.now()).toMillis();
            Integer status = exchange.getResponse().getStatusCode() != null ? exchange.getResponse().getStatusCode().value() : null;

            if (status != null && status == 429) {
                log.warn("[GW-OUT] RATE_LIMITED method={} path={} route={} ip={} userId={}", method, path, routeId, ip, userId);
            } else {
                log.info("[GW-OUT] method={} path={} route={} status={} durationMs={}", method, path, routeId, status, durationMs);
            }
        });
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 1;
    }

    private String extractClientIp(ServerWebExchange exchange) {
        String forwardedFor = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            return forwardedFor.split(",")[0].trim();
        }
        InetSocketAddress remoteAddress = exchange.getRequest().getRemoteAddress();
        return remoteAddress != null ? remoteAddress.getAddress().getHostAddress() : "unknown-ip";
    }
}