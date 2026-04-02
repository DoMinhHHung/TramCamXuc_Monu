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

    private final GatewayAuthFilter gatewayAuthFilter;
    private final InternalRequestFilter internalRequestFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
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
                    "/artists/by-user/**",
                    "/artists/register",
                    "/artists/*/songs",
                    "/soundcloud/tracks/search",
                    "/albums",
                    "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html"
                ).permitAll()
                .requestMatchers(HttpMethod.GET, "/songs/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/artists/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/albums/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/playlists/*").permitAll()
                .anyRequest().authenticated()
            )
                .addFilterBefore(internalRequestFilter,
                        UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(gatewayAuthFilter,
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
