package iuh.fit.se.apigateway.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "security.jwt")
public record GatewayJwtProperties(String secret) {
}
