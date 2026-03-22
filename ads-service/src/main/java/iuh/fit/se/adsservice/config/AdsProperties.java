package iuh.fit.se.adsservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "ads")
public class AdsProperties {

    private Session session = new Session();
    private Click click = new Click();
    private Budget budget = new Budget();

    @Data
    public static class Session {
        private int maxSongsBeforeAd = 5;
        private long maxListenedSeconds = 1800;
        private int sessionTtlHours = 2;
    }

    @Data
    public static class Click {
        private int antiSpamLimit = 3;
        private int antiSpamWindowSeconds = 60;
    }

    @Data
    public static class Budget {
        private long checkIntervalMs = 300_000L;
    }
}
