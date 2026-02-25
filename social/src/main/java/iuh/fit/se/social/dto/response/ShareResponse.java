package iuh.fit.se.social.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareResponse {
    private String shareUrl;
    private String qrCodeBase64;
}