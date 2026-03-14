package iuh.fit.se.socialservice.service;

import iuh.fit.se.socialservice.dto.response.ShareResponse;

import java.util.UUID;

public interface ShareService {
    ShareResponse getShareLink(UUID songId, String platform, UUID userId);
    ShareResponse getShareLink(UUID songId, UUID artistId, String platform, UUID userId);

    ShareResponse getQrCode(UUID songId, UUID userId);
    ShareResponse getQrCode(UUID songId, UUID artistId, UUID userId);

    long getShareCount(UUID songId);

    ShareResponse getPlaylistShareLink(UUID playlistId, String platform);
    ShareResponse getPlaylistQrCode(UUID playlistId);

    ShareResponse getAlbumShareLink(UUID albumId, String platform);
    ShareResponse getAlbumQrCode(UUID albumId);
}
