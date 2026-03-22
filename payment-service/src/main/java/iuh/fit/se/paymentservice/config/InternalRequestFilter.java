package iuh.fit.se.paymentservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j
public class InternalRequestFilter extends OncePerRequestFilter {

    @Value("${internal.service-secret:}")
    private String expectedSecret;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain)
            throws ServletException, IOException {

        String requestURI = request.getRequestURI();

        if (!requestURI.startsWith("/api/internal/")) {
            chain.doFilter(request, response);
            return;
        }

        if (!StringUtils.hasText(expectedSecret)) {
            log.error("[InternalFilter] INTERNAL_SERVICE_SECRET chưa cấu hình!");
            rejectRequest(response, "Server misconfiguration");
            return;
        }

        String providedSecret = request.getHeader("X-Internal-Secret");

        if (!constantTimeEquals(expectedSecret, providedSecret)) {
            log.warn("[InternalFilter] Unauthorized call to '{}' from IP: {}",
                    requestURI, getClientIp(request));
            rejectRequest(response, "Forbidden");
            return;
        }

        log.debug("[InternalFilter] Authorized internal call to '{}'", requestURI);
        chain.doFilter(request, response);
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }

    private void rejectRequest(HttpServletResponse response, String message)
            throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                String.format("{\"code\":9996,\"message\":\"%s\"}", message));
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}