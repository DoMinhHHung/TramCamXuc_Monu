package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.enums.AlbumStatus;
import iuh.fit.se.musicservice.entity.Album;
import iuh.fit.se.musicservice.repository.AlbumRepository;
import iuh.fit.se.musicservice.service.AlbumAutoPublishService;
import iuh.fit.se.musicservice.service.AlbumScheduledPublishCoordinator;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Component
@RequiredArgsConstructor
@Slf4j
public class AlbumScheduledPublishCoordinatorImpl implements AlbumScheduledPublishCoordinator {

    private static final String LOCK_RECONCILE = "lock:album:publish-reconcile";

    private final AlbumRepository albumRepository;
    private final AlbumAutoPublishService albumAutoPublishService;
    private final StringRedisTemplate stringRedisTemplate;

    @Qualifier("albumPublishTaskScheduler")
    private final ThreadPoolTaskScheduler albumPublishTaskScheduler;

    private final ConcurrentHashMap<UUID, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();

    @PostConstruct
    @Override
    public void bootstrapFutureTasks() {
        try {
            ZonedDateTime now = ZonedDateTime.now();
            List<Album> upcoming = albumRepository.findScheduledPublishInFuture(now, AlbumStatus.PRIVATE);
            for (Album a : upcoming) {
                if (a.getScheduledPublishAt() != null) {
                    registerPublishTask(a.getId(), a.getScheduledPublishAt().toInstant());
                }
            }
            log.info("[AlbumPublishCoordinator] bootstrapped {} scheduled album task(s)", upcoming.size());
        } catch (Exception e) {
            log.warn("[AlbumPublishCoordinator] bootstrap failed: {}", e.getMessage());
        }
    }

    @Override
    public void registerPublishTask(UUID albumId, Instant publishInstant) {
        cancelPublishTask(albumId);
        Instant now = Instant.now();
        if (!publishInstant.isAfter(now)) {
            albumAutoPublishService.publishScheduledAlbum(albumId);
            return;
        }
        Runnable job = () -> {
            try {
                albumAutoPublishService.publishScheduledAlbum(albumId);
            } finally {
                scheduledTasks.remove(albumId);
            }
        };
        ScheduledFuture<?> f = albumPublishTaskScheduler.schedule(job, publishInstant);
        scheduledTasks.put(albumId, f);
        log.info("[AlbumPublishCoordinator] scheduled album {} at {}", albumId, publishInstant);
    }

    @Override
    public void cancelPublishTask(UUID albumId) {
        ScheduledFuture<?> f = scheduledTasks.remove(albumId);
        if (f != null) {
            f.cancel(false);
        }
    }

    /**
     * Mỗi 10 phút: đồng bộ album quá hạn (recovery), và đăng ký task cho album trong cửa sổ 10p tới nếu chưa có.
     */
    @Scheduled(fixedDelay = 600_000)
    public void reconcileAndQueueWindow() {
        Boolean acquired = stringRedisTemplate.opsForValue()
                .setIfAbsent(LOCK_RECONCILE, "1", Duration.ofSeconds(620));
        if (!Boolean.TRUE.equals(acquired)) {
            return;
        }
        try {
            ZonedDateTime now = ZonedDateTime.now();
            albumRepository.findAlbumsReadyToPublish(now, AlbumStatus.PRIVATE).forEach(a -> {
                albumAutoPublishService.publishScheduledAlbum(a.getId());
                cancelPublishTask(a.getId());
            });

            ZonedDateTime horizon = now.plusMinutes(10);
            albumRepository.findScheduledBetween(now, horizon, AlbumStatus.PRIVATE).forEach(a -> {
                if (!scheduledTasks.containsKey(a.getId()) && a.getScheduledPublishAt() != null) {
                    registerPublishTask(a.getId(), a.getScheduledPublishAt().toInstant());
                }
            });
        } finally {
            stringRedisTemplate.delete(LOCK_RECONCILE);
        }
    }
}
