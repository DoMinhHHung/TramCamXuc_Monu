package iuh.fit.se.recommendationservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Bounded pool for home-feed parallel Feign/Redis calls — avoids unbounded ForkJoin common pool
 * and keeps CompletableFuture.supplyAsync work off the calling request thread.
 */
@Configuration
public class RecommendationFetchExecutorConfig {

    public static final String BEAN_NAME = "recommendationFetchExecutor";

    @Bean(name = BEAN_NAME)
    public Executor recommendationFetchExecutor() {
        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
        ex.setCorePoolSize(8);
        ex.setMaxPoolSize(16);
        ex.setQueueCapacity(100);
        ex.setThreadNamePrefix("rec-fetch-");
        ex.setWaitForTasksToCompleteOnShutdown(true);
        ex.setAwaitTerminationSeconds(15);
        ex.initialize();
        return ex;
    }
}
