package iuh.fit.se.socialservice.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Document(collection = "listen_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListenHistory {
    @Id
    private String id;

    private Instant listenedAt;
    private ListenMeta meta;

    private UUID songId;
    private UUID artistId;
    private UUID userId;
    private UUID playlistId;
    private UUID albumId;
    private int durationSeconds;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListenMeta {
        private String userId;
        private String songId;
    }
}
