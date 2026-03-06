package iuh.fit.se.socialservice.service.impl;

import iuh.fit.se.socialservice.document.Reaction;
import iuh.fit.se.socialservice.dto.response.ReactionResponse;
import iuh.fit.se.socialservice.enums.ReactionType;
import iuh.fit.se.socialservice.exception.AppException;
import iuh.fit.se.socialservice.exception.ErrorCode;
import iuh.fit.se.socialservice.repository.ReactionRepository;
import iuh.fit.se.socialservice.service.ReactionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReactionServiceImpl implements ReactionService {

    private final ReactionRepository reactionRepository;

    @Override
    public ReactionResponse react(UUID userId, UUID songId, ReactionType type) {
        Reaction reaction = reactionRepository.findByUserIdAndSongId(userId, songId)
                .orElse(Reaction.builder().userId(userId).songId(songId).build());
        reaction.setType(type);
        reaction = reactionRepository.save(reaction);
        return toResponse(reaction, getSongReactionSummary(songId));
    }

    @Override
    public void removeReaction(UUID userId, UUID songId) {
        if (!reactionRepository.existsByUserIdAndSongId(userId, songId)) {
            throw new AppException(ErrorCode.REACTION_NOT_FOUND);
        }
        reactionRepository.deleteByUserIdAndSongId(userId, songId);
    }

    @Override
    public ReactionResponse getUserReaction(UUID userId, UUID songId) {
        Reaction reaction = reactionRepository.findByUserIdAndSongId(userId, songId)
                .orElseThrow(() -> new AppException(ErrorCode.REACTION_NOT_FOUND));
        return toResponse(reaction, getSongReactionSummary(songId));
    }

    @Override
    public Map<ReactionType, Long> getSongReactionSummary(UUID songId) {
        List<Reaction> reactions = reactionRepository.findBySongId(songId);
        return Arrays.stream(ReactionType.values())
                .collect(Collectors.toMap(
                        t -> t,
                        t -> reactions.stream().filter(r -> r.getType() == t).count()
                ));
    }

    private ReactionResponse toResponse(Reaction r, Map<ReactionType, Long> summary) {
        return ReactionResponse.builder()
                .id(r.getId())
                .userId(r.getUserId())
                .songId(r.getSongId())
                .type(r.getType())
                .summary(summary)
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
