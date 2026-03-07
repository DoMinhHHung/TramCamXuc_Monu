package iuh.fit.se.recommendationservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    @Value("${ml.service.timeout-ms:5000}")
    private int mlTimeoutMs;

    @Bean(name = "mlRestTemplate")
    public RestTemplate mlRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(mlTimeoutMs);
        factory.setReadTimeout(mlTimeoutMs);
        return new RestTemplate(factory);
    }
}