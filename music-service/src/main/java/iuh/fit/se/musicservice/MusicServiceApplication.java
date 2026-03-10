package iuh.fit.se.musicservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableDiscoveryClient
@EnableJpaAuditing
@EnableAsync
@EnableScheduling
@EnableFeignClients(basePackages = "iuh.fit.se.musicservice.client")
public class MusicServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(MusicServiceApplication.class, args);
    }
}