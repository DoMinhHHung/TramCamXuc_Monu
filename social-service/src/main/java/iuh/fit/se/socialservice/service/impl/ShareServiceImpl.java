package iuh.fit.se.socialservice.service.impl;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import iuh.fit.se.socialservice.document.SongShare;
import iuh.fit.se.socialservice.dto.response.ShareResponse;
import iuh.fit.se.socialservice.repository.SongShareRepository;
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

    private final SongShareRepository songShareRepository;

    @Override
    public ShareResponse getShareLink(UUID songId, String platform, UUID userId) {
        return getShareLink(songId, null, platform, userId);
    }

    @Override
    public ShareResponse getShareLink(UUID songId, UUID artistId, String platform, UUID userId) {
        String url = frontendUrl + "/songs/" + songId;
        String platformUrl = buildPlatformUrl(platform, url);
        recordShare(songId, artistId, userId, platform);
        return ShareResponse.builder()
                .shareUrl(platformUrl)
                .platform(platform)
                .shareCount(songShareRepository.countBySongId(songId))
                .build();
    }

    @Override
    public ShareResponse getQrCode(UUID songId, UUID userId) {
        return getQrCode(songId, null, userId);
    }

    @Override
    public ShareResponse getQrCode(UUID songId, UUID artistId, UUID userId) {
        String url = frontendUrl + "/songs/" + songId;
        recordShare(songId, artistId, userId, "qr");
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
                    .shareCount(songShareRepository.countBySongId(songId))
                    .build();
        } catch (Exception e) {
            log.error("QR code generation failed for songId={}", songId, e);
            return ShareResponse.builder()
                    .shareUrl(url).platform("qr")
                    .shareCount(songShareRepository.countBySongId(songId))
                    .build();
        }
    }

    @Override
    public long getShareCount(UUID songId) {
        return songShareRepository.countBySongId(songId);
    }

    @Override
    public ShareResponse getPlaylistShareLink(UUID playlistId, String platform) {
        String url = frontendUrl + "/playlist/" + playlistId;
        String platformUrl = buildPlatformUrl(platform, url);
        return ShareResponse.builder()
                .shareUrl(platformUrl)
                .platform(platform)
                .build();
    }

    @Override
    public ShareResponse getPlaylistQrCode(UUID playlistId) {
        String url = frontendUrl + "/playlist/" + playlistId;
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
            log.error("Playlist QR generation failed for playlistId={}", playlistId, e);
            return ShareResponse.builder().shareUrl(url).platform("qr").build();
        }
    }

    @Override
    public ShareResponse getAlbumShareLink(UUID albumId, String platform) {
        String url = frontendUrl + "/album/" + albumId;
        String platformUrl = buildPlatformUrl(platform, url);
        return ShareResponse.builder()
                .shareUrl(platformUrl)
                .platform(platform)
                .build();
    }

    @Override
    public ShareResponse getAlbumQrCode(UUID albumId) {
        String url = frontendUrl + "/album/" + albumId;
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
            log.error("Album QR generation failed for albumId={}", albumId, e);
            return ShareResponse.builder().shareUrl(url).platform("qr").build();
        }
    }

    private void recordShare(UUID songId, UUID artistId, UUID userId, String platform) {
        songShareRepository.save(SongShare.builder()
                .songId(songId)
                .artistId(artistId)
                .userId(userId)
                .platform(platform != null ? platform : "direct")
                .build());
        log.info("Share recorded: songId={}, artistId={}, userId={}, platform={}", songId, artistId, userId, platform);
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
