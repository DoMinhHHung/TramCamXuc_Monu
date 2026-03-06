package iuh.fit.se.socialservice.service.impl;

import iuh.fit.se.socialservice.document.ListenHistory;
import iuh.fit.se.socialservice.dto.message.SongListenEvent;
import iuh.fit.se.socialservice.dto.response.ListenHistoryResponse;
import iuh.fit.se.socialservice.repository.ListenHistoryRepository;
import iuh.fit.se.socialservice.service.ListenHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ListenHistoryServiceImpl implements ListenHistoryService {

    private final ListenHistoryRepository listenHistoryRepository;

    @Override
    public void recordListen(SongListenEvent event) {
        Instant listenedAt = event.getListenedAt() != null ? event.getListenedAt() : Instant.now();

        ListenHistory.ListenMeta meta = ListenHistory.ListenMeta.builder()
                .userId(event.getUserId() != null ? event.getUserId().toString() : null)
                .songId(event.getSongId() != null ? event.getSongId().toString() : null)
                .build();

        ListenHistory record = ListenHistory.builder()
                .userId(event.getUserId())
                .songId(event.getSongId())
                .artistId(event.getArtistId())
                .playlistId(event.getPlaylistId())
                .albumId(event.getAlbumId())
                .durationSeconds(event.getDurationSeconds())
                .listenedAt(listenedAt)
                .meta(meta)
                .build();

        listenHistoryRepository.save(record);
        log.debug("Recorded listen event for songId={}, userId={}", event.getSongId(), event.getUserId());
    }

    @Override
    public Page<ListenHistoryResponse> getUserHistory(UUID userId, Pageable pageable) {
        return listenHistoryRepository.findByUserIdOrderByListenedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    @Override
    public long getSongListenCount(UUID songId) {
        return listenHistoryRepository.countBySongId(songId);
    }

    private ListenHistoryResponse toResponse(ListenHistory h) {
        return ListenHistoryResponse.builder()
                .id(h.getId())
                .userId(h.getUserId())
                .songId(h.getSongId())
                .artistId(h.getArtistId())
                .playlistId(h.getPlaylistId())
                .albumId(h.getAlbumId())
                .durationSeconds(h.getDurationSeconds())
                .listenedAt(h.getListenedAt())
                .build();
    }
}
