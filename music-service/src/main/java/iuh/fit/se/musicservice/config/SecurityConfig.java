package iuh.fit.se.musicservice.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final TrustedHeaderAuthFilter trustedHeaderAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints — không cần token
                .requestMatchers(
                    "/songs",
                    "/songs/trending",
                    "/songs/newest",
                    "/songs/batch",
                    "/songs/by-artist/**",
                    "/songs/*/play",
                    "/songs/*/listen",
                    "/genres",
                    "/genres/**",
                    "/artists",
                    "/artists/register",
                    "/artists/*/songs",
                    "/albums",
                    "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html"
                ).permitAll()
                .requestMatchers(HttpMethod.GET, "/songs/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/artists/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/albums/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/playlists/*").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(trustedHeaderAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
