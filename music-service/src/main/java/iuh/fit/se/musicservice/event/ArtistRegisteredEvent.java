package iuh.fit.se.musicservice.event;

import lombok.*;

import java.io.Serializable;
import java.util.UUID;

/**
 * Gửi sang identity-service qua RabbitMQ khi artist đăng ký thành công.
 * identity-service nhận được → thêm ROLE_ARTIST cho user.
 * Client sau đó gọi /auth/refresh để nhận JWT mới với ROLE_ARTIST.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArtistRegisteredEvent implements Serializable {
    private UUID userId;
    private String stageName;
}
