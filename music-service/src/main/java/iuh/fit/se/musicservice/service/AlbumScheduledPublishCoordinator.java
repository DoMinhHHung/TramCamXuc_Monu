package iuh.fit.se.musicservice.service;

import java.time.Instant;
import java.util.UUID;

public interface AlbumScheduledPublishCoordinator {

    void registerPublishTask(UUID albumId, Instant publishInstant);

    void cancelPublishTask(UUID albumId);

    void bootstrapFutureTasks();
}
