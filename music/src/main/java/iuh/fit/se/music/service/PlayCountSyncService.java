package iuh.fit.se.music.service;

import java.util.UUID;

public interface PlayCountSyncService {
    void increment(UUID songId);
    void flushToDatabase();
}
