package iuh.fit.se.social;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(
        scanBasePackages = {
                "iuh.fit.se.social",
                "iuh.fit.se.core"
        },
        exclude = {
                DataSourceAutoConfiguration.class,
                HibernateJpaAutoConfiguration.class
        }
)
@EnableFeignClients
public class SocialServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(SocialServiceApplication.class, args);
    }
}
