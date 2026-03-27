package iuh.fit.se.recommendationservice.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.util.StringUtils;

public class InternalFeignConfig {

    @Value("${internal.service-secret:}")
    private String serviceSecret;

    @Bean
    public RequestInterceptor internalSecretInterceptor() {
        return requestTemplate -> {
            if (StringUtils.hasText(serviceSecret)) {
                requestTemplate.header("X-Internal-Secret", serviceSecret);
            }
        };
    }
}