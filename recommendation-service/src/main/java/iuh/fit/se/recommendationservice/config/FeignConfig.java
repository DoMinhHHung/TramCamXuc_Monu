package iuh.fit.se.recommendationservice.config;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public class FeignConfig {

    @Bean
    public RequestInterceptor gatewayHeadersForwardInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

            if (attrs == null) return;

            HttpServletRequest request = attrs.getRequest();

            String xAuthenticated = request.getHeader("X-Authenticated");
            String xUserId        = request.getHeader("X-User-Id");
            String xUserRole      = request.getHeader("X-User-Role");
            String xUserEmail     = request.getHeader("X-User-Email");

            if (StringUtils.hasText(xAuthenticated)) {
                requestTemplate.header("X-Authenticated", xAuthenticated);
            }
            if (StringUtils.hasText(xUserId)) {
                requestTemplate.header("X-User-Id", xUserId);
            }
            if (StringUtils.hasText(xUserRole)) {
                requestTemplate.header("X-User-Role", xUserRole);
            }
            if (StringUtils.hasText(xUserEmail)) {
                requestTemplate.header("X-User-Email", xUserEmail);
            }
        };
    }
}