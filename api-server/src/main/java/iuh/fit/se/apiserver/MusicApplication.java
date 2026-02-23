package iuh.fit.se.apiserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {
        "iuh.fit.se.apiserver",
        "iuh.fit.se.core",
        "iuh.fit.se.identity",
        "iuh.fit.se.music",
        "iuh.fit.se.payment",
        "iuh.fit.se.integration"
})
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = "iuh.fit.se")
@EntityScan(basePackages = "iuh.fit.se")
@EnableAsync
@EnableScheduling
public class MusicApplication {
    public static void main(String[] args) {
        SpringApplication.run(MusicApplication.class, args);
    }
}