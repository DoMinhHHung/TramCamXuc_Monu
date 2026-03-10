package iuh.fit.se.socialservice.service.impl;

import iuh.fit.se.socialservice.document.Reaction;
import iuh.fit.se.socialservice.dto.response.ReactionResponse;
import iuh.fit.se.socialservice.dto.response.ReactionUserEntry;
import iuh.fit.se.socialservice.enums.ReactionType;
import iuh.fit.se.socialservice.exception.AppException;
import iuh.fit.se.socialservice.exception.ErrorCode;
import iuh.fit.se.socialservice.repository.ReactionRepository;
import iuh.fit.se.socialservice.service.ReactionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReactionServiceImpl implements ReactionService {

    private final ReactionRepository reactionRepository;

    // ── LIKE ──────────────────────────────────────────────────────────────────

    @Override
    public ReactionResponse like(UUID userId, UUID songId, UUID artistId) {
        Optional<Reaction> existing = reactionRepository.findByUserIdAndSongId(userId, songId);

        if (existing.isPresent()) {
            Reaction reaction = existing.get();

            if (reaction.getType() == ReactionType.LIKE) {
                // Đang LIKE → bấm lại → bỏ LIKE (un-like)
                reactionRepository.delete(reaction);
                log.info("User {} un-liked song {}", userId, songId);
                return buildSummary(userId, songId, null);
            } else {
                // Đang DISLIKE → chuyển sang LIKE
                reaction.setType(ReactionType.LIKE);
                reactionRepository.save(reaction);
                log.info("User {} switched from DISLIKE to LIKE on song {}", userId, songId);
                return buildSummary(userId, songId, reaction);
            }
        }

        // Chưa react → thêm LIKE
        Reaction reaction = reactionRepository.save(
                Reaction.builder()
                        .userId(userId)
                        .songId(songId)
                        .artistId(artistId)
                        .type(ReactionType.LIKE)
                        .build());
        log.info("User {} liked song {}", userId, songId);
        return buildSummary(userId, songId, reaction);
    }

    // ── DISLIKE ───────────────────────────────────────────────────────────────

    @Override
    public ReactionResponse dislike(UUID userId, UUID songId, UUID artistId) {
        Optional<Reaction> existing = reactionRepository.findByUserIdAndSongId(userId, songId);

        if (existing.isPresent()) {
            Reaction reaction = existing.get();

            if (reaction.getType() == ReactionType.DISLIKE) {
                // Đang DISLIKE → bấm lại → bỏ DISLIKE (un-dislike)
                reactionRepository.delete(reaction);
                log.info("User {} un-disliked song {}", userId, songId);
                return buildSummary(userId, songId, null);
            } else {
                // Đang LIKE → chuyển sang DISLIKE
                reaction.setType(ReactionType.DISLIKE);
                reactionRepository.save(reaction);
                log.info("User {} switched from LIKE to DISLIKE on song {}", userId, songId);
                return buildSummary(userId, songId, reaction);
            }
        }

        // Chưa react → thêm DISLIKE
        Reaction reaction = reactionRepository.save(
                Reaction.builder()
                        .userId(userId)
                        .songId(songId)
                        .artistId(artistId)
                        .type(ReactionType.DISLIKE)
                        .build());
        log.info("User {} disliked song {}", userId, songId);
        return buildSummary(userId, songId, reaction);
    }

    // ── REMOVE ────────────────────────────────────────────────────────────────

    @Override
    public void removeReaction(UUID userId, UUID songId) {
        if (!reactionRepository.existsByUserIdAndSongId(userId, songId)) {
            throw new AppException(ErrorCode.REACTION_NOT_FOUND);
        }
        reactionRepository.deleteByUserIdAndSongId(userId, songId);
        log.info("User {} removed reaction from song {}", userId, songId);
    }

    // ── QUERY ─────────────────────────────────────────────────────────────────

    @Override
    public Optional<ReactionResponse> getUserReaction(UUID userId, UUID songId) {
        return reactionRepository.findByUserIdAndSongId(userId, songId)
                .map(r -> buildSummary(userId, songId, r));
    }

    @Override
    public ReactionResponse getSongSummary(UUID songId) {
        return buildSummary(null, songId, null);
    }

    @Override
    public Page<ReactionUserEntry> getLikers(UUID songId, Pageable pageable) {
        return reactionRepository
                .findBySongIdAndTypeOrderByCreatedAtDesc(songId, ReactionType.LIKE, pageable)
                .map(r -> ReactionUserEntry.builder()
                        .userId(r.getUserId())
                        .type(r.getType())
                        .reactedAt(r.getCreatedAt())
                        .build());
    }

    @Override
    public Page<ReactionUserEntry> getDislikers(UUID songId, Pageable pageable) {
        return reactionRepository
                .findBySongIdAndTypeOrderByCreatedAtDesc(songId, ReactionType.DISLIKE, pageable)
                .map(r -> ReactionUserEntry.builder()
                        .userId(r.getUserId())
                        .type(r.getType())
                        .reactedAt(r.getCreatedAt())
                        .build());
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private ReactionResponse buildSummary(UUID userId, UUID songId, Reaction reaction) {
        long likes    = reactionRepository.countBySongIdAndType(songId, ReactionType.LIKE);
        long dislikes = reactionRepository.countBySongIdAndType(songId, ReactionType.DISLIKE);
        return ReactionResponse.builder()
                .id(reaction != null ? reaction.getId() : null)
                .userId(userId)
                .songId(songId)
                .type(reaction != null ? reaction.getType() : null)
                .likeCount(likes)
                .dislikeCount(dislikes)
                .createdAt(reaction != null ? reaction.getCreatedAt() : null)
                .updatedAt(reaction != null ? reaction.getUpdatedAt() : null)
                .build();
    }
}
