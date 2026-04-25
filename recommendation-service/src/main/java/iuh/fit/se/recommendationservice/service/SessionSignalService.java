package iuh.fit.se.recommendationservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.recommendationservice.dto.SessionSignalDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Quản lý session-based signals trong Redis.
 *
 * Key: rec:session:{userId} → LIST of SessionSignalDto (max 10 entries, LIFO)
 * TTL: 60 phút → session tự expire sau 1h không hoạt động
 *
 * Tại sao session quan trọng hơn lịch sử dài hạn:
 *   User vừa skip 3 EDM → họ không muốn nghe EDM lúc này
 *   User nghe liên tục ballad → đẩy sâu hơn vào mood đó
 *   User repeat 1 bài → super like tức thì
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SessionSignalService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String SESSION_KEY_PREFIX   = "rec:session:";
    private static final int    MAX_SESSION_EVENTS   = 10;
    private static final long   SESSION_TTL_MINUTES  = 60;

    // ── Write path ────────────────────────────────────────────────────────────

    public void recordSignal(UUID userId, SessionSignalDto signal) {
        String key = SESSION_KEY_PREFIX + userId;
        try {
            redisTemplate.opsForList().leftPush(key, signal);
            redisTemplate.opsForList().trim(key, 0, MAX_SESSION_EVENTS - 1);
            redisTemplate.expire(key, Duration.ofMinutes(SESSION_TTL_MINUTES));
            log.debug("[Session] Recorded {} for userId={} songId={}", signal.getType(), userId, signal.getSongId());
        } catch (Exception e) {
            log.warn("[Session] Failed to record signal userId={}: {}", userId, e.getMessage());
        }
    }

    // ── Read path ─────────────────────────────────────────────────────────────

    /**
     * Tổng hợp session signals → preference để re-rank forYou.
     */
    public SessionPreference computeSessionPreference(UUID userId) {
        String key = SESSION_KEY_PREFIX + userId;
        try {
            List<Object> rawSignals = redisTemplate.opsForList().range(key, 0, MAX_SESSION_EVENTS - 1);
            if (rawSignals == null || rawSignals.isEmpty()) return SessionPreference.neutral();

            Map<String, Integer> genreBoost   = new HashMap<>();
            Map<String, Integer> genrePenalty = new HashMap<>();
            Map<String, Integer> artistBoost  = new HashMap<>();

            for (Object raw : rawSignals) {
                try {
                    SessionSignalDto signal = objectMapper.convertValue(raw, SessionSignalDto.class);
                    if (signal == null || signal.getType() == null) continue;
                    applySignal(signal, genreBoost, genrePenalty, artistBoost);
                } catch (Exception ignored) {}
            }

            return new SessionPreference(genreBoost, genrePenalty, artistBoost);
        } catch (Exception e) {
            log.warn("[Session] Failed to compute preference userId={}: {}", userId, e.getMessage());
            return SessionPreference.neutral();
        }
    }

    private void applySignal(
            SessionSignalDto signal,
            Map<String, Integer> genreBoost,
            Map<String, Integer> genrePenalty,
            Map<String, Integer> artistBoost) {

        List<String> genres   = signal.getGenreIds() != null ? signal.getGenreIds() : List.of();
        String       artistId = signal.getArtistId();

        switch (signal.getType()) {
            case REPEATED   -> {
                genres.forEach(g -> genreBoost.merge(g, 3, Integer::sum));
                if (artistId != null) artistBoost.merge(artistId, 2, Integer::sum);
            }
            case COMPLETED  -> {
                genres.forEach(g -> genreBoost.merge(g, 2, Integer::sum));
                if (artistId != null) artistBoost.merge(artistId, 1, Integer::sum);
            }
            case PLAYED     -> genres.forEach(g -> genreBoost.merge(g, 1, Integer::sum));
            case SKIP_EARLY -> genres.forEach(g -> genrePenalty.merge(g, 3, Integer::sum));
            case SKIPPED    -> genres.forEach(g -> genrePenalty.merge(g, 1, Integer::sum));
        }
    }

    // ── Value object ──────────────────────────────────────────────────────────

    public record SessionPreference(
            Map<String, Integer> genreBoost,
            Map<String, Integer> genrePenalty,
            Map<String, Integer> artistBoost) {

        public static SessionPreference neutral() {
            return new SessionPreference(Map.of(), Map.of(), Map.of());
        }

        /**
         * Score modifier [0.05, 2.5] cho một bài dựa trên session.
         * > 1.0 = session đang thích thể loại này
         * < 1.0 = session đang không muốn thể loại này
         */
        public double scoreModifier(Collection<String> genreIds, String artistId) {
            Stream<String> genres = genreIds != null ? genreIds.stream() : Stream.empty();

            double boost   = genres.mapToInt(g -> genreBoost.getOrDefault(g, 0)).sum() * 0.20;
            double penalty = (genreIds != null ? genreIds.stream() : Stream.<String>empty())
                    .mapToInt(g -> genrePenalty.getOrDefault(g, 0)).sum() * 0.30;
            double artBonus = artistId != null ? artistBoost.getOrDefault(artistId, 0) * 0.15 : 0;

            return Math.max(0.05, Math.min(2.5, 1.0 + boost - penalty + artBonus));
        }

        public boolean isEmpty() {
            return genreBoost.isEmpty() && genrePenalty.isEmpty() && artistBoost.isEmpty();
        }
    }
}
