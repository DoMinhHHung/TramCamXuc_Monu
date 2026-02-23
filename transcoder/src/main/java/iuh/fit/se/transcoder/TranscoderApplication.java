package iuh.fit.se.transcoder;

import iuh.fit.se.core.configuration.*;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.context.annotation.Import;


@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class, HibernateJpaAutoConfiguration.class})
@Import({MinioConfig.class, RabbitMQConfig.class})
public class TranscoderApplication {
    public static void main(String[] args) {
        SpringApplication.run(TranscoderApplication.class, args);
    }
}