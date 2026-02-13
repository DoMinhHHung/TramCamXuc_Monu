package iuh.fit.se.identity.service;

import iuh.fit.se.core.event.ArtistRegisteredEvent;
import iuh.fit.se.identity.enums.Role;
import iuh.fit.se.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class ArtistRoleListener {

    private final UserRepository userRepository;

    @EventListener
    @Transactional
    public void handleArtistRegistration(ArtistRegisteredEvent event) {
        userRepository.findById(event.getUserId()).ifPresent(user -> {
            if (user.getRole() == Role.USER) {
                user.setRole(Role.ARTIST);
                userRepository.save(user);
                log.info("Upgraded User {} to Role ARTIST", user.getId());
            }
        });
    }
}