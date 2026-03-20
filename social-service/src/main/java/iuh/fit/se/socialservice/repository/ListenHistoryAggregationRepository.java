package iuh.fit.se.socialservice.repository;

import iuh.fit.se.socialservice.document.ListenHistory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ListenHistoryAggregationRepository {

    private final MongoTemplate mongoTemplate;

    // ─────────────────────────────────────────────────────────────────────────
    // Top songs — top 10 bài nghe nhiều nhất trong N ngày
    // ─────────────────────────────────────────────────────────────────────────

    public List<Map<String, Object>> findTopSongsByPlayCount(UUID userId,
                                                             int days,
                                                             int limit) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);

        MatchOperation match = Aggregation.match(
                Criteria.where("userId").is(userId)
                        .and("listenedAt").gte(since)
        );

        GroupOperation group = Aggregation.group("songId")
                .count().as("playCount")
                .sum("durationSeconds").as("totalDurationSeconds");

        SortOperation sort = Aggregation.sort(Sort.by(Sort.Direction.DESC, "playCount"));
        LimitOperation limitOp = Aggregation.limit(limit);

        Aggregation aggregation = Aggregation.newAggregation(match, group, sort, limitOp);

        return mongoTemplate.aggregate(aggregation, ListenHistory.class, Map.class)
                .getMappedResults()
                .stream()
                .map(m -> (Map<String, Object>) (Map<?, ?>) m)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Top artists — top 10 nghệ sĩ theo tổng thời gian nghe trong N ngày
    // ─────────────────────────────────────────────────────────────────────────

    public List<Map<String, Object>> findTopArtistsByDuration(UUID userId,
                                                              int days,
                                                              int limit) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);

        MatchOperation match = Aggregation.match(
                Criteria.where("userId").is(userId)
                        .and("listenedAt").gte(since)
                        .and("artistId").ne(null)
        );

        GroupOperation group = Aggregation.group("artistId")
                .sum("durationSeconds").as("totalDurationSeconds")
                .count().as("playCount");

        SortOperation sort = Aggregation.sort(Sort.by(Sort.Direction.DESC, "totalDurationSeconds"));
        LimitOperation limitOp = Aggregation.limit(limit);

        Aggregation aggregation = Aggregation.newAggregation(match, group, sort, limitOp);

        return mongoTemplate.aggregate(aggregation, ListenHistory.class, Map.class)
                .getMappedResults()
                .stream()
                .map(m -> (Map<String, Object>) (Map<?, ?>) m)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Tổng thời gian nghe + số bài unique trong N ngày
    // ─────────────────────────────────────────────────────────────────────────

    public Map<String, Long> getSummaryStats(UUID userId, int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);

        MatchOperation match = Aggregation.match(
                Criteria.where("userId").is(userId)
                        .and("listenedAt").gte(since)
        );
        GroupOperation group = Aggregation.group()
                .sum("durationSeconds").as("totalSeconds")
                .addToSet("songId").as("uniqueSongIds");

        ProjectionOperation project = Aggregation.project()
                .and("totalSeconds").as("totalSeconds")
                .and(ArrayOperators.Size.lengthOfArray("uniqueSongIds")).as("uniqueSongsCount");

        Aggregation aggregation = Aggregation.newAggregation(match, group, project);

        List<Map> results = mongoTemplate.aggregate(
                aggregation, ListenHistory.class, Map.class).getMappedResults();

        if (results.isEmpty()) {
            Map<String, Long> empty = new HashMap<>();
            empty.put("totalSeconds", 0L);
            empty.put("uniqueSongsCount", 0L);
            return empty;
        }

        Map<String, Long> result = new HashMap<>();
        Map row = results.get(0);
        result.put("totalSeconds",     toLong(row.get("totalSeconds")));
        result.put("uniqueSongsCount", toLong(row.get("uniqueSongsCount")));
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Phân bổ nghe theo GIỜ trong ngày (24 buckets)
    // ─────────────────────────────────────────────────────────────────────────

    public List<Long> getListenCountByHour(UUID userId, int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);

        MatchOperation match = Aggregation.match(
                Criteria.where("userId").is(userId)
                        .and("listenedAt").gte(since)
        );

        ProjectionOperation addHour = Aggregation.project()
                .and(DateOperators.dateOf("listenedAt").hour()).as("hour");

        GroupOperation group = Aggregation.group("hour").count().as("count");

        Aggregation aggregation = Aggregation.newAggregation(match, addHour, group);

        List<Map> raw = mongoTemplate.aggregate(
                aggregation, ListenHistory.class, Map.class).getMappedResults();

        Long[] slots = new Long[24];
        Arrays.fill(slots, 0L);
        for (Map row : raw) {
            int hour = ((Number) row.get("_id")).intValue();
            slots[hour] = toLong(row.get("count"));
        }
        return Arrays.asList(slots);
    }

    public List<Long> getListenCountByDayOfWeek(UUID userId, int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);

        MatchOperation match = Aggregation.match(
                Criteria.where("userId").is(userId)
                        .and("listenedAt").gte(since)
        );

        // MongoDB $dayOfWeek: 1=Sun, 2=Mon, ..., 7=Sat
        ProjectionOperation addDay = Aggregation.project()
                .and(DateOperators.dateOf("listenedAt").dayOfWeek()).as("dow");

        GroupOperation group = Aggregation.group("dow").count().as("count");

        Aggregation aggregation = Aggregation.newAggregation(match, addDay, group);

        List<Map> raw = mongoTemplate.aggregate(
                aggregation, ListenHistory.class, Map.class).getMappedResults();

        // Map MongoDB dow (1=Sun) sang index (0=Mon..6=Sun)
        Long[] slots = new Long[7];
        Arrays.fill(slots, 0L);
        for (Map row : raw) {
            int mongoDow = ((Number) row.get("_id")).intValue();
            int idx = (mongoDow == 1) ? 6 : mongoDow - 2;
            if (idx >= 0 && idx < 7) {
                slots[idx] = toLong(row.get("count"));
            }
        }
        return Arrays.asList(slots);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Listening streak — đếm chuỗi ngày nghe liên tiếp
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Tính chuỗi ngày nghe nhạc liên tiếp tính đến hôm nay.
     * Trả về {currentStreak, longestStreak}.
     *
     * Thuật toán:
     *   1. Aggregate danh sách ngày (UTC date) có ít nhất 1 listen event
     *   2. Sort DESC
     *   3. Duyệt từ hôm nay ngược về — đếm chuỗi liên tiếp
     */
    public Map<String, Integer> calculateStreak(UUID userId) {
        // Lấy 365 ngày gần nhất (đủ để tính streak dài nhất thực tế)
        Instant since = Instant.now().minus(365, ChronoUnit.DAYS);

        MatchOperation match = Aggregation.match(
                Criteria.where("userId").is(userId)
                        .and("listenedAt").gte(since)
        );

        ProjectionOperation addDate = Aggregation.project()
                .and(DateOperators.dateOf("listenedAt")
                        .toString("%Y-%m-%d")).as("dateStr");

        GroupOperation group = Aggregation.group("dateStr");
        SortOperation sort   = Aggregation.sort(Sort.by(Sort.Direction.DESC, "_id"));

        Aggregation aggregation = Aggregation.newAggregation(match, addDate, group, sort);

        List<String> dates = mongoTemplate.aggregate(
                        aggregation, ListenHistory.class, Map.class)
                .getMappedResults()
                .stream()
                .map(m -> (String) m.get("_id"))
                .collect(Collectors.toList());

        return computeStreaks(dates);
    }

    public List<String> findNewlyDiscoveredArtists(UUID userId, int recentDays, int limit) {
        Instant recentSince = Instant.now().minus(recentDays, ChronoUnit.DAYS);
        Instant olderSince  = recentSince.minus(90, ChronoUnit.DAYS);

        Set<String> recentArtists = getArtistIdsInRange(userId, recentSince, Instant.now());

        Set<String> olderArtists  = getArtistIdsInRange(userId, olderSince, recentSince);

        return recentArtists.stream()
                .filter(id -> !olderArtists.contains(id))
                .limit(limit)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private Set<String> getArtistIdsInRange(UUID userId, Instant from, Instant to) {
        MatchOperation match = Aggregation.match(
                Criteria.where("userId").is(userId)
                        .and("artistId").ne(null)
                        .and("listenedAt").gte(from).lt(to)
        );
        GroupOperation group = Aggregation.group("artistId");
        Aggregation agg = Aggregation.newAggregation(match, group);

        return mongoTemplate.aggregate(agg, ListenHistory.class, Map.class)
                .getMappedResults()
                .stream()
                .map(m -> m.get("_id").toString())
                .collect(Collectors.toSet());
    }

    private Map<String, Integer> computeStreaks(List<String> sortedDatesDesc) {
        if (sortedDatesDesc.isEmpty()) {
            return Map.of("currentStreak", 0, "longestStreak", 0);
        }

        List<java.time.LocalDate> dates = sortedDatesDesc.stream()
                .map(java.time.LocalDate::parse)
                .collect(Collectors.toList());

        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneOffset.UTC);

        int currentStreak = 0;
        java.time.LocalDate expected = dates.contains(today) ? today : today.minusDays(1);

        for (java.time.LocalDate d : dates) {
            if (d.equals(expected)) {
                currentStreak++;
                expected = expected.minusDays(1);
            } else if (d.isBefore(expected)) {
                break;
            }
        }

        int longest = 0, current = 1;
        for (int i = 1; i < dates.size(); i++) {
            if (dates.get(i - 1).minusDays(1).equals(dates.get(i))) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 1;
            }
        }
        longest = Math.max(longest, current);

        return Map.of("currentStreak", currentStreak, "longestStreak", longest);
    }

    private long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Long l)    return l;
        if (val instanceof Integer i) return i.longValue();
        if (val instanceof Number n)  return n.longValue();
        return 0L;
    }
}