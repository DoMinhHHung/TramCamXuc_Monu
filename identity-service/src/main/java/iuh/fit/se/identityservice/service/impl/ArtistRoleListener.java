package iuh.fit.se.identityservice.service.impl;

import iuh.fit.se.identityservice.config.RabbitMQConfig;
import iuh.fit.se.identityservice.enums.Role;
import iuh.fit.se.identityservice.event.ArtistRegisteredEvent;
import iuh.fit.se.identityservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
@RequiredArgsConstructor
@Slf4j
public class ArtistRoleListener {

    private final UserRepository userRepository;

    @RabbitListener(queues = RabbitMQConfig.IDENTITY_ARTIST_QUEUE)
    @Transactional
    public void handleArtistRegistered(ArtistRegisteredEvent event) {
        log.info("Artist registered event received for user: {}", event.getUserId());

        userRepository.findById(event.getUserId()).ifPresent(user -> {
            if (user.getRole() == Role.USER) {
                user.setRole(Role.ARTIST);
                userRepository.save(user);
                log.info("Upgraded user {} to ARTIST role", user.getId());
            }
        });
    }
}