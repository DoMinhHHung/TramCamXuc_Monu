package iuh.fit.se.transcoderservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Message nhận từ music-service khi artist confirm upload xong.
 * Routing key: song.transcode
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TranscodeSongMessage {
    /** ID bài hát trong DB của music-service */
    private UUID songId;

    /** Key của file raw trên MinIO bucket raw-songs (vd: raw/artist-id/song-id.mp3) */
    private String rawFileKey;

    /** Extension của file gốc (mp3, wav, flac, ...) */
    private String fileExtension;
}
