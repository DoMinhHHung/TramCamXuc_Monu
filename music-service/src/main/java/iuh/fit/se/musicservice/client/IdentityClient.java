package iuh.fit.se.musicservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

import java.util.UUID;

/**
 * Feign client gọi sang identity-service (service name từ Eureka).
 *
 * Endpoint nội bộ: POST /internal/users/{userId}/grant-artist-role
 * → identity-service thêm ROLE_ARTIST vào DB và cấp lại JWT mới.
 * → Trả về token string (Bearer).
 *
 * Không cần auth header vì đây là internal endpoint (chỉ nhận từ các service khác
 * trong cluster, không expose ra ngoài qua gateway).
 */
@FeignClient(name = "identity-service", path = "/internal")
public interface IdentityClient {

    /**
     * Gán ROLE_ARTIST cho user và trả về JWT mới đã bao gồm role đó.
     * Client nhận token này và dùng ngay — không cần đăng nhập lại.
     *
     * @param userId UUID của user cần nâng cấp
     * @return JWT string mới (không có prefix "Bearer ")
     */
    @PostMapping("/users/{userId}/grant-artist-role")
    String grantArtistRoleAndIssueToken(@PathVariable("userId") UUID userId);
}
