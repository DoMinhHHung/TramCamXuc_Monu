package iuh.fit.se.musicservice.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints — không cần token
                .requestMatchers(
                    "/api/v1/songs",
                    "/api/v1/songs/trending",
                    "/api/v1/songs/newest",
                    "/api/v1/songs/by-artist/**",
                    "/api/v1/songs/*/play",
                    "/api/v1/songs/*/listen",
                    "/api/v1/genres",
                    "/api/v1/genres/**",
                    "/api/v1/artists",           // tìm kiếm nghệ sĩ
                    "/api/v1/artists/register",  // đăng ký (cần JWT nhưng không cần ROLE_ARTIST)
                    "/api/v1/albums",            // danh sách album PUBLIC
                    "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html"
                ).permitAll()
                // Song detail — public nhưng GET /{songId} cũng cần match
                .requestMatchers("GET", "/api/v1/songs/*").permitAll()
                // Artist public profile
                .requestMatchers("GET", "/api/v1/artists/*").permitAll()
                // Album public detail
                .requestMatchers("GET", "/api/v1/albums/*").permitAll()
                // Playlist public by slug (PUBLIC + COLLABORATIVE)
                .requestMatchers("GET", "/api/v1/playlists/*").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
