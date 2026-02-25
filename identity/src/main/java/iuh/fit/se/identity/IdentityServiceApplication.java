package iuh.fit.se.identity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {
        "iuh.fit.se.identity",
        "iuh.fit.se.core"
})
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = "iuh.fit.se.identity.repository")
@EntityScan(basePackages = {
        "iuh.fit.se.identity.entity",
        "iuh.fit.se.core.entity"
})
public class IdentityServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(IdentityServiceApplication.class, args);
    }
}
