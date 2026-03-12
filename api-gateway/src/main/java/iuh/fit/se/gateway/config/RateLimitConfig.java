package iuh.fit.se.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.util.Optional;

@Configuration
public class RateLimitConfig {

    @Bean
    public KeyResolver ipAndUserKeyResolver() {
        return exchange -> {
            String routeId = Optional.ofNullable(exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR))
                    .map(route -> ((Route) route).getId())
                    .orElse("unknown-route");

            String userId = exchange.getAttribute("X-User-Id");

            if (StringUtils.hasText(userId)) {
                return Mono.just(routeId + ":user:" + userId);
            } else {
                String ip = extractClientIp(exchange);
                return Mono.just(routeId + ":ip:" + ip);
            }
        };
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