package iuh.fit.se.music.service.impl;

import iuh.fit.se.core.constant.SubscriptionConstants;
import iuh.fit.se.core.event.SubscriptionActiveEvent;
import iuh.fit.se.music.enums.ArtistStatus;
import iuh.fit.se.music.repository.ArtistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ArtistSubscriptionListener {

    private final ArtistRepository artistRepository;

    @EventListener
    @Transactional
    public void handleSubscriptionChange(SubscriptionActiveEvent event) {
        Map<String, Object> features = event.getFeatures();
        boolean canBeArtist = Boolean.TRUE.equals(features.get(SubscriptionConstants.FEATURE_CAN_BECOME_ARTIST));

        artistRepository.findByUserId(event.getUserId()).ifPresent(artist -> {
            if (canBeArtist && artist.getStatus() == ArtistStatus.EXPIRED_SUBSCRIPTION) {
                artist.setStatus(ArtistStatus.ACTIVE);
                log.info("Artist {} reactivated due to subscription renewal", artist.getStageName());
            }
            else if (!canBeArtist && artist.getStatus() == ArtistStatus.ACTIVE) {
                artist.setStatus(ArtistStatus.EXPIRED_SUBSCRIPTION);
                log.info("Artist {} suspended due to subscription expiration", artist.getStageName());
            }

            artistRepository.save(artist);
        });
    }
}