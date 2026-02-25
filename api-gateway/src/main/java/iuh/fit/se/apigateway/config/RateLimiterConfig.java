package iuh.fit.se.apigateway.config;

import java.net.InetSocketAddress;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimiterConfig {

    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> resolveClientIp(exchange)
                .defaultIfEmpty("anonymous");
    }

    private Mono<String> resolveClientIp(ServerWebExchange exchange) {
        return Mono.justOrEmpty(exchange.getRequest().getHeaders().getFirst("X-Forwarded-For"))
                .map(value -> value.split(",")[0].trim())
                .filter(value -> !value.isEmpty())
                .switchIfEmpty(Mono.fromSupplier(() -> {
                    InetSocketAddress remoteAddress = exchange.getRequest().getRemoteAddress();
                    if (remoteAddress == null || remoteAddress.getAddress() == null) {
                        return "anonymous";
                    }
                    return remoteAddress.getAddress().getHostAddress();
                }));
    }
}
