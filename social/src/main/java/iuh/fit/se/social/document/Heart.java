package iuh.fit.se.social.document;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "hearts")
@CompoundIndexes({
        @CompoundIndex(name = "idx_heart_user_artist", def = "{'userId': 1, 'artistId': 1}", unique = true),
        @CompoundIndex(name = "idx_heart_artist", def = "{'artistId': 1}")
})
public class Heart {

    @Id
    private String id;

    private UUID userId;
    private UUID artistId;

    @CreatedDate
    private LocalDateTime createdAt;
}