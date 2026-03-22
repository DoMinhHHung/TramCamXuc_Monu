// identity-service/src/main/java/iuh/fit/se/identityservice/controller/InternalUserController.java

package iuh.fit.se.identityservice.controller;

import iuh.fit.se.identityservice.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/internal/users")
@RequiredArgsConstructor
@Slf4j
public class InternalUserController {

    private final AuthService authService;

    @PostMapping("/{userId}/grant-artist-role")
    public String grantArtistRoleAndIssueToken(
            @PathVariable UUID userId,
            HttpServletRequest request) {

        log.info(
                "[INTERNAL AUDIT] grant-artist-role: userId={}, callerIP={}",
                userId,
                request.getHeader("X-Forwarded-For") != null
                        ? request.getHeader("X-Forwarded-For")
                        : request.getRemoteAddr()
        );

        return authService.grantArtistRoleAndIssueToken(userId);
    }
}