package iuh.fit.se.recommendationservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@Slf4j
public class GatewayAuthFilter extends OncePerRequestFilter {

    @Value("${gateway.internal-secret:}")
    private String expectedGatewaySecret;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain)
            throws ServletException, IOException {

        String authenticated    = request.getHeader("X-Authenticated");
        String userId           = request.getHeader("X-User-Id");
        String role             = request.getHeader("X-User-Role");
        String providedSecret   = request.getHeader("X-Gateway-Secret");

        boolean secretValid = StringUtils.hasText(expectedGatewaySecret)
                && constantTimeEquals(expectedGatewaySecret, providedSecret);

        if ("true".equals(authenticated)
                && StringUtils.hasText(userId)
                && secretValid
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            List<SimpleGrantedAuthority> authorities =
                    StringUtils.hasText(role)
                            ? List.of(new SimpleGrantedAuthority("ROLE_" + role))
                            : List.of();

            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(userId, null, authorities);

            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);

            log.debug("[GatewayAuth] userId={} role={}", userId, role);
        } else if ("true".equals(authenticated) && !secretValid) {
            log.warn("[GatewayAuth] Rejected: X-Authenticated=true but gateway secret invalid. IP={}",
                    request.getRemoteAddr());
        }

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
}