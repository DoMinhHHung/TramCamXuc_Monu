package iuh.fit.se.socialservice.service.impl;

import iuh.fit.se.socialservice.document.ListenHistory;
import iuh.fit.se.socialservice.dto.response.TopSongListenEntry;
import iuh.fit.se.socialservice.service.ListenPeriod;
import iuh.fit.se.socialservice.service.ListenStatsService;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListenStatsServiceImpl implements ListenStatsService {

    private final MongoTemplate mongoTemplate;

    @Override
    public List<TopSongListenEntry> topSongs(ListenPeriod period, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 200);
        Instant now = Instant.now();
        Instant from = switch (period) {
            case DAY -> now.minus(1, ChronoUnit.DAYS);
            case WEEK -> now.minus(7, ChronoUnit.DAYS);
            case MONTH -> now.minus(30, ChronoUnit.DAYS);
        };

        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("listenedAt").gte(from).lte(now)),
                Aggregation.group("songId").count().as("listenCount"),
                Aggregation.sort(Sort.Direction.DESC, "listenCount"),
                Aggregation.limit(safeLimit),
                Aggregation.project("listenCount").and("_id").as("songId")
        );

        AggregationResults<Document> results = mongoTemplate.aggregate(
                agg, ListenHistory.class, Document.class);

        List<TopSongListenEntry> out = new ArrayList<>();
        for (Document doc : results.getMappedResults()) {
            Object sid = doc.get("songId");
            Object cnt = doc.get("listenCount");
            if (sid == null || cnt == null) {
                continue;
            }
            UUID songId = sid instanceof UUID u ? u : UUID.fromString(sid.toString());
            long listenCount = cnt instanceof Number n ? n.longValue() : Long.parseLong(cnt.toString());
            out.add(TopSongListenEntry.builder().songId(songId).listenCount(listenCount).build());
        }
        return out;
    }
}
