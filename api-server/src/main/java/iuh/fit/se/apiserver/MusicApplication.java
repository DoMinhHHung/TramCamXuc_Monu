package iuh.fit.se.apiserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "iuh.fit.se")
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = "iuh.fit.se")
@EntityScan(basePackages = "iuh.fit.se")
public class MusicApplication {

    public static void main(String[] args) {
        SpringApplication.run(MusicApplication.class, args);
    }
}