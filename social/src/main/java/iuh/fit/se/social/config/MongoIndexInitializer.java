package iuh.fit.se.social.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.model.CreateCollectionOptions;
import com.mongodb.client.model.TimeSeriesGranularity;
import com.mongodb.client.model.TimeSeriesOptions;
import iuh.fit.se.social.document.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.index.IndexResolver;
import org.springframework.data.mongodb.core.index.MongoPersistentEntityIndexResolver;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;

import java.util.ArrayList;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class MongoIndexInitializer {

    private final MongoTemplate mongoTemplate;
    private final MongoMappingContext mongoMappingContext;

    @PostConstruct
    public void initIndexes() {
        createTimeSeriesCollectionIfNotExists();
        for (Class<?> clazz : new Class[]{Follow.class, Heart.class, Reaction.class, Comment.class, CommentLike.class}) {
            IndexOperations indexOps = mongoTemplate.indexOps(clazz);
            IndexResolver resolver = new MongoPersistentEntityIndexResolver(mongoMappingContext);
            resolver.resolveIndexFor(clazz).forEach(indexOps::ensureIndex);
        }
        log.info("Social module MongoDB indexes initialized.");
    }

    private void createTimeSeriesCollectionIfNotExists() {
        try {
            var db = mongoTemplate.getDb();
            boolean exists = db.listCollectionNames()
                    .into(new ArrayList<>())
                    .contains("listen_history");

            if (!exists) {
                TimeSeriesOptions tsOptions = new TimeSeriesOptions("listenedAt")
                        .metaField("meta")
                        .granularity(TimeSeriesGranularity.SECONDS);

                db.createCollection("listen_history",
                        new CreateCollectionOptions().timeSeriesOptions(tsOptions));

                log.info("Created MongoDB Time Series collection: listen_history");
            }
        } catch (Exception e) {
            log.warn("Could not create Time Series collection (may already exist): {}", e.getMessage());
        }
    }
}