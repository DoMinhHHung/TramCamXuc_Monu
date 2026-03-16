package iuh.fit.se.adsservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableDiscoveryClient
@EnableJpaAuditing
@EnableAsync
@EnableScheduling
public class AdsServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AdsServiceApplication.class, args);
    }
}
