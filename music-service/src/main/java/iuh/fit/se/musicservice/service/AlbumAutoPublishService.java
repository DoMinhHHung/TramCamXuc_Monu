package iuh.fit.se.musicservice.service;

import java.util.UUID;

/**
 * Publish album theo lịch (cron / exact-time task), không cần artist trong security context.
 */
public interface AlbumAutoPublishService {

    void publishScheduledAlbum(UUID albumId);
}
