package iuh.fit.se.musicservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
public class AlbumPublishSchedulerConfig {

    @Bean(name = "albumPublishTaskScheduler")
    public ThreadPoolTaskScheduler albumPublishTaskScheduler() {
        ThreadPoolTaskScheduler s = new ThreadPoolTaskScheduler();
        s.setPoolSize(4);
        s.setThreadNamePrefix("album-publish-");
        s.initialize();
        return s;
    }
}
