package iuh.fit.se.music;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(scanBasePackages = {
        "iuh.fit.se.music",
        "iuh.fit.se.core"
})
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = "iuh.fit.se.music.repository")
@EntityScan(basePackages = {
        "iuh.fit.se.music.entity",
        "iuh.fit.se.core.entity"
})
@EnableScheduling
@EnableFeignClients
public class MusicServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(MusicServiceApplication.class, args);
    }
}
