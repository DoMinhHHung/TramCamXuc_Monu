package iuh.fit.se.airecommendation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication(scanBasePackages = {"iuh.fit.se.airecommendation", "iuh.fit.se.core"})
@EnableDiscoveryClient
public class AiRecommendationApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiRecommendationApplication.class, args);
    }
}
