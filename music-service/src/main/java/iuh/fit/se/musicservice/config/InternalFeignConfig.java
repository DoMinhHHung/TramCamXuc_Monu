package iuh.fit.se.musicservice.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InternalFeignConfig {

    @Value("${internal.service-secret:}")
    private String serviceSecret;

    @Bean
    public RequestInterceptor internalSecretInterceptor() {
        return requestTemplate -> requestTemplate.header("X-Service-Secret", serviceSecret);
    }
}
