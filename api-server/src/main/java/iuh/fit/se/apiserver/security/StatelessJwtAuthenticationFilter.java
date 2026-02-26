package iuh.fit.se.apiserver.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class StatelessJwtAuthenticationFilter extends OncePerRequestFilter {

    private final SecretKey signingKey;

    public StatelessJwtAuthenticationFilter(JwtSecurityProperties jwtSecurityProperties) {
        this.signingKey = Keys.hmacShaKeyFor(jwtSecurityProperties.secret().getBytes(StandardCharsets.UTF_8));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractBearerToken(request);

        if (StringUtils.hasText(token) && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                Claims claims = Jwts.parser()
                        .verifyWith(signingKey)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();

                String userId = claims.getSubject();
                if (StringUtils.hasText(userId)) {
                    Collection<GrantedAuthority> authorities = extractAuthorities(claims);
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userId,
                            null,
                            authorities
                    );
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (JwtException ignored) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractBearerToken(HttpServletRequest request) {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(authorization) || !authorization.startsWith("Bearer ")) {
            return null;
        }

        String token = authorization.substring(7).trim();
        return StringUtils.hasText(token) ? token : null;
    }

    private Collection<GrantedAuthority> extractAuthorities(Claims claims) {
        Object authoritiesClaim = claims.get("authorities");
        if (authoritiesClaim == null) {
            authoritiesClaim = claims.get("role");
        }

        List<String> roles = normalizeRoles(authoritiesClaim);
        if (roles.isEmpty()) {
            return Collections.emptyList();
        }

        return roles.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }

    private List<String> normalizeRoles(Object roleClaim) {
        if (roleClaim == null) {
            return Collections.emptyList();
        }

        if (roleClaim instanceof String roleString) {
            return List.of(roleString.split(","));
        }

        if (roleClaim instanceof Collection<?> values) {
            List<String> roles = new ArrayList<>();
            for (Object value : values) {
                if (value != null) {
                    roles.add(String.valueOf(value));
                }
            }
            return roles;
        }

        return List.of(String.valueOf(roleClaim));
    }
}
