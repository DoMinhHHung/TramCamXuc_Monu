package iuh.fit.se.socialservice.service;

import iuh.fit.se.socialservice.dto.response.ReactionResponse;
import iuh.fit.se.socialservice.dto.response.ReactionUserEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface ReactionService {

    ReactionResponse like(UUID userId, UUID songId, UUID artistId);

    ReactionResponse dislike(UUID userId, UUID songId, UUID artistId);

    void removeReaction(UUID userId, UUID songId);

    Optional<ReactionResponse> getUserReaction(UUID userId, UUID songId);

    ReactionResponse getSongSummary(UUID songId);

    Page<ReactionUserEntry> getLikers(UUID songId, Pageable pageable);

    Page<ReactionUserEntry> getDislikers(UUID songId, Pageable pageable);
}
