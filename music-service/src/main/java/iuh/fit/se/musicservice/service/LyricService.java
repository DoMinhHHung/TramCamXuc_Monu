package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.response.LyricResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface LyricService {
    LyricResponse uploadLyric(UUID songId, MultipartFile file);
    void deleteLyric(UUID songId);
    LyricResponse getLyric(UUID songId);
    List<UUID> searchSongsByLyric(String keyword, int limit, int offset);
}