package iuh.fit.se.socialservice.service.impl;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import iuh.fit.se.socialservice.dto.response.ShareResponse;
import iuh.fit.se.socialservice.service.ShareService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShareServiceImpl implements ShareService {

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Override
    public ShareResponse getShareLink(UUID songId, String platform) {
        String url = frontendUrl + "/songs/" + songId;
        String platformUrl = buildPlatformUrl(platform, url);
        return ShareResponse.builder()
                .shareUrl(platformUrl)
                .platform(platform)
                .build();
    }

    @Override
    public ShareResponse getQrCode(UUID songId) {
        String url = frontendUrl + "/songs/" + songId;
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(url, BarcodeFormat.QR_CODE, 300, 300);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
            String base64 = Base64.getEncoder().encodeToString(baos.toByteArray());
            return ShareResponse.builder()
                    .shareUrl(url)
                    .qrCodeBase64("data:image/png;base64," + base64)
                    .platform("qr")
                    .build();
        } catch (Exception e) {
            log.error("QR code generation failed for songId={}", songId, e);
            return ShareResponse.builder()
                    .shareUrl(url)
                    .platform("qr")
                    .build();
        }
    }

    private String buildPlatformUrl(String platform, String songUrl) {
        if (platform == null) return songUrl;
        return switch (platform.toLowerCase()) {
            case "facebook" -> "https://www.facebook.com/sharer/sharer.php?u=" + songUrl;
            case "twitter"  -> "https://twitter.com/intent/tweet?url=" + songUrl;
            case "telegram" -> "https://t.me/share/url?url=" + songUrl;
            default         -> songUrl;
        };
    }
}
