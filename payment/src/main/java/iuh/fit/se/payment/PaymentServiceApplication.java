package iuh.fit.se.payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {
        "iuh.fit.se.payment",
        "iuh.fit.se.core"
})
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = "iuh.fit.se.payment.repository")
@EntityScan(basePackages = {
        "iuh.fit.se.payment.entity",
        "iuh.fit.se.core.entity"
})
@EnableScheduling
public class PaymentServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PaymentServiceApplication.class, args);
    }
}
