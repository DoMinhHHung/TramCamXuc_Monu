package iuh.fit.se.social.service.impl;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import iuh.fit.se.social.dto.response.ShareResponse;
import iuh.fit.se.social.enums.TargetType;
import iuh.fit.se.social.service.ShareService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.util.Base64;
import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShareServiceImpl implements ShareService {

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    private static final Duration QR_CACHE_TTL = Duration.ofHours(24);

    @Override
    public ShareResponse getShareInfo(UUID targetId, TargetType targetType, String slug) {
        String shareUrl = buildShareUrl(targetType, slug);
        String qrCacheKey = "social:qr:" + targetType + ":" + targetId;

        // Thử lấy QR từ Redis cache
        Object cachedQr = redisTemplate.opsForValue().get(qrCacheKey);
        if (cachedQr != null) {
            return ShareResponse.builder()
                    .shareUrl(shareUrl)
                    .qrCodeBase64(cachedQr.toString())
                    .build();
        }

        // Generate QR
        String qrBase64 = generateQRCode(shareUrl);
        redisTemplate.opsForValue().set(qrCacheKey, qrBase64, QR_CACHE_TTL);

        return ShareResponse.builder()
                .shareUrl(shareUrl)
                .qrCodeBase64(qrBase64)
                .build();
    }

    private String buildShareUrl(TargetType targetType, String slug) {
        return switch (targetType) {
            case PLAYLIST -> frontendUrl + "/playlist/" + slug;
            case ALBUM    -> frontendUrl + "/album/" + slug;
        };
    }

    private String generateQRCode(String content) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 1);

            BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, 300, 300, hints);
            BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", baos);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (WriterException | IOException e) {
            log.error("Error generating QR code for: {}", content, e);
            return "";
        }
    }
}