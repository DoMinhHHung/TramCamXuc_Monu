package iuh.fit.se.socialservice.service;

import iuh.fit.se.socialservice.dto.response.ShareResponse;

import java.util.UUID;

public interface ShareService {
    ShareResponse getShareLink(UUID songId, String platform);
    ShareResponse getQrCode(UUID songId);
}
