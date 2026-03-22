package iuh.fit.se.socialservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j
public class InternalSecretFilter extends OncePerRequestFilter {

    @Value("${internal.service-secret:}")
    private String serviceSecret;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String requestUri = request.getRequestURI();
        if (!requestUri.startsWith("/internal/")) {
            chain.doFilter(request, response);
            return;
        }

        String providedSecret = request.getHeader("X-Service-Secret");
        if (serviceSecret == null || !serviceSecret.equals(providedSecret)) {
            log.warn("[InternalFilter] Unauthorized internal call to {} from IP: {}", requestUri, request.getRemoteAddr());
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"code\":403,\"message\":\"Forbidden: internal endpoint\"}");
            return;
        }

        chain.doFilter(request, response);
    }
}
