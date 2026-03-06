package iuh.fit.se.socialservice.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareResponse {
    private String shareUrl;
    private String qrCodeBase64;
    private String platform;
}
