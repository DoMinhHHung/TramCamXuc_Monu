package iuh.fit.se.musicservice.dto.response;

import iuh.fit.se.musicservice.enums.ArtistStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ArtistResponse {
    private UUID id;
    private UUID userId;
    private String stageName;
    private String bio;
    private String avatarUrl;
    private ArtistStatus status;
    private LocalDateTime createdAt;
    private boolean isJamendo;

    /** Hint cho client khi vừa đăng ký — cần refresh token để nhận ROLE_ARTIST */
    private String hint;

    /**
     * JWT mới đã chứa ROLE_ARTIST — chỉ có trong response của register endpoint.
     * Client dùng token này ngay để gọi các API cần quyền artist mà không cần đăng nhập lại.
     */
    private String newToken;
}
