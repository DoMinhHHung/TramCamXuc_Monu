package iuh.fit.se.transcoderservice.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

@Configuration
@Slf4j
public class TranscodeThreadPoolConfig {

    @Bean(name = "transcodeExecutor")
    public ExecutorService transcodeExecutor() {
        AtomicInteger counter = new AtomicInteger(0);
        return new ThreadPoolExecutor(
                5, 5,
                60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(20),
                r -> {
                    Thread t = new Thread(r);
                    t.setName("ffmpeg-worker-" + counter.incrementAndGet());
                    t.setDaemon(true);
                    return t;
                },
                new ThreadPoolExecutor.CallerRunsPolicy()
        ) {
            @Override
            public void shutdown() {
                log.info("[TranscodeExecutor] Initiating shutdown, interrupting {} active threads",
                        getActiveCount());
                super.shutdownNow();
            }
        };
    }
}