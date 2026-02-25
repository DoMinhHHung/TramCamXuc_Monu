package iuh.fit.se.identity.service;

import iuh.fit.se.identity.entity.User;
import iuh.fit.se.identity.enums.Role;

public interface UserProfileCacheService {
    String buildCacheKey(String userId);
    void cacheUserProfile(User user);
    void evictUserProfile(String userId);
    String defaultRole(Role role);
}
