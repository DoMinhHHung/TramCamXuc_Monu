package iuh.fit.se.musicservice.utils;

import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public final class SecurityUtils {
    private SecurityUtils() {}

    public static UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        try {
            return UUID.fromString(auth.getPrincipal().toString());
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
    }
}
