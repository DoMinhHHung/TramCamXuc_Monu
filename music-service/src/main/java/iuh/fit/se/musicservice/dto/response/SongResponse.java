package iuh.fit.se.musicservice.dto.response;

import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.TrackSource;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SongResponse {

    private UUID id;
    private String title;
    private String slug;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private Long playCount;

    private SongStatus status;
    private TranscodeStatus transcodeStatus;

    // Soft-delete info (chỉ trả về cho admin)
    private boolean deleted;
    private LocalDateTime deletedAt;
    private String deleteReason;

    private ArtistInfo primaryArtist;
    private Set<GenreResponse> genres;

    /** Presigned URL để artist upload file lên MinIO (chỉ có khi requestUploadUrl) */
    private String uploadUrl;

    /** URL stream HLS (chỉ có khi getStreamUrl) */
    private String streamUrl;

    /** Nguồn bài hát: local/jamendo/spotify/soundcloud */
    private TrackSource source;

    /** Deep link sang nền tảng gốc cho bài external. */
    private String externalUrl;

    /** ID track trên nền tảng third-party (nếu có). */
    private String externalTrackId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ArtistInfo {
        private UUID artistId;
        private UUID userId;
        private String stageName;
        private String avatarUrl;
    }
}
