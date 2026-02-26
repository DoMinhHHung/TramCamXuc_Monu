package iuh.fit.se.music;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(scanBasePackages = {"iuh.fit.se.music", "iuh.fit.se.core"})
@EnableDiscoveryClient
@EnableFeignClients(basePackages = "iuh.fit.se.music.client")
public class MusicApplication {

    public static void main(String[] args) {
        SpringApplication.run(MusicApplication.class, args);
    }
}
