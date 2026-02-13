package iuh.fit.se.identity.configuration;

import iuh.fit.se.identity.entity.User;
import iuh.fit.se.identity.enums.AccountStatus;
import iuh.fit.se.identity.enums.Role;
import iuh.fit.se.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @Override
    public void run(ApplicationArguments args) {
        String adminEmail = env.getProperty("app.admin.email");
        String adminPassword = env.getProperty("app.admin.password");

        if (adminEmail == null || adminPassword == null) {
            return;
        }

        if (userRepository.existsByEmail(adminEmail)) {
        } else {
            User admin = User.builder()
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPassword))
                    .fullName("Super Admin")
                    .role(Role.ADMIN)
                    .status(AccountStatus.ACTIVE)
                    .build();

            userRepository.save(admin);
            log.info("Default Admin user created successfully: {}", adminEmail);
        }
    }
}