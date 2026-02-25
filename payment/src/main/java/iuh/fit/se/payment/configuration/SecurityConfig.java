package iuh.fit.se.payment.configuration;

import iuh.fit.se.core.security.GatewayHeaderAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/payments/payos_transfer_handler", "/service-payment/payments/**").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(new GatewayHeaderAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
