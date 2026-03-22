package iuh.fit.se.recommendationservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Configuration
public class RestTemplateConfig {

    @Value("${internal.service-secret:}")
    private String serviceSecret;

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(10_000);
        RestTemplate restTemplate = new RestTemplate(factory);
        ClientHttpRequestInterceptor interceptor = (request, body, execution) -> {
            request.getHeaders().add("X-Service-Secret", serviceSecret);
            return execution.execute(request, body);
        };
        restTemplate.setInterceptors(List.of(interceptor));
        return restTemplate;
    }
}
