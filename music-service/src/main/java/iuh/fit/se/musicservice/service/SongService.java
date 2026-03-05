package iuh.fit.se.musicservice.service;

import java.util.UUID;

public interface SongService {
    void softDeleteReportedSong(UUID songId, String adminId);
}
