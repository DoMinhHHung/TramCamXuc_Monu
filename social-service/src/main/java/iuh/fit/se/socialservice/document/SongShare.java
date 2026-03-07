package iuh.fit.se.socialservice.document;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

/**
 * Ghi nhận mỗi lượt share bài hát.
 * userId = null nếu user chưa đăng nhập (chia sẻ ẩn danh).
 */
@Document(collection = "song_shares")
@CompoundIndexes({
        @CompoundIndex(name = "song_shares_created", def = "{'songId': 1, 'createdAt': -1}"),
        @CompoundIndex(name = "artist_shares",       def = "{'artistId': 1, 'createdAt': -1}")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SongShare {
    @Id
    private String id;

    @Indexed
    private UUID songId;

    /** artistId của bài hát — để tính tổng share theo artist */
    private UUID artistId;

    /** null nếu user chưa đăng nhập */
    private UUID userId;

    /** facebook / twitter / telegram / direct / qr */
    private String platform;

    @CreatedDate
    private Instant createdAt;
}


