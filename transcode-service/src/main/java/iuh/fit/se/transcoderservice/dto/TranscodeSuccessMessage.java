package iuh.fit.se.transcoderservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Message gửi về music-service sau khi transcode + upload MinIO thành công.
 * Routing key: song.transcode.success
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TranscodeSuccessMessage {
    /** ID bài hát */
    private UUID songId;

    /** Thời lượng tính bằng giây (ffprobe) */
    private int duration;

    /**
     * Đường dẫn tương đối tới master.m3u8 trên MinIO public-songs bucket.
     * Ví dụ: hls/song-uuid/master.m3u8
     */
    private String hlsMasterUrl;
}
