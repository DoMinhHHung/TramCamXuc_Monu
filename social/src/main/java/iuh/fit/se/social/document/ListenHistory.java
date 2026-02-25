package iuh.fit.se.social.document;

import lombok.*;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;
import org.springframework.data.mongodb.core.mapping.TimeSeries;
import org.springframework.data.mongodb.core.timeseries.Granularity;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "listen_history")
@TimeSeries(timeField = "listenedAt", metaField = "meta", granularity = Granularity.SECONDS)
public class ListenHistory {

    @MongoId
    private String id;

    private Instant listenedAt;

    private ListenMeta meta;

    private int durationSeconds;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListenMeta {
        private UUID songId;
        private UUID artistId;
        private UUID userId;
        private UUID playlistId;
        private UUID albumId;
    }
}