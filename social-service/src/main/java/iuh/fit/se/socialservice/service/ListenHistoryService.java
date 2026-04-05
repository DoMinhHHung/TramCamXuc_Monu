package iuh.fit.se.socialservice.service;

import iuh.fit.se.socialservice.dto.message.SongListenEvent;
import iuh.fit.se.socialservice.dto.response.ListenHistoryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ListenHistoryService {
    void recordListen(SongListenEvent event);
    Page<ListenHistoryResponse> getUserHistory(UUID userId, Pageable pageable);
    long getSongListenCount(UUID songId);
}
