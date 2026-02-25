package iuh.fit.se.social.service;

import iuh.fit.se.social.dto.response.ShareResponse;
import iuh.fit.se.social.enums.TargetType;

import java.util.UUID;

public interface ShareService {
    ShareResponse getShareInfo(UUID targetId, TargetType targetType, String slug);
}