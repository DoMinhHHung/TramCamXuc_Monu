package iuh.fit.se.identityservice.service.impl;

import iuh.fit.se.identityservice.entity.User;
import iuh.fit.se.identityservice.enums.AccountStatus;
import iuh.fit.se.identityservice.enums.Role;
import iuh.fit.se.identityservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment env;

    @Value("${app.admin.email}")
    private String adminEmail;
    @Value("${app.admin.password}")
    private String adminPassword;

    @Override
    public void run(ApplicationArguments args) {
        String email    = adminEmail;
        String password = adminPassword;

        if (email == null || password == null) return;
        if (userRepository.existsByEmail(email)) return;

        userRepository.save(User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .fullName("Super Admin")
                .role(Role.ADMIN)
                .status(AccountStatus.ACTIVE)
                .build());

        log.info("Default admin created: {}", email);
    }
}