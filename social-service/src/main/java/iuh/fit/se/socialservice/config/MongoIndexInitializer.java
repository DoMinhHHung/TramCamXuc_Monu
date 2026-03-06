package iuh.fit.se.socialservice.config;

import com.mongodb.client.model.CreateCollectionOptions;
import com.mongodb.client.model.TimeSeriesGranularity;
import com.mongodb.client.model.TimeSeriesOptions;
import iuh.fit.se.socialservice.document.*;
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
import java.util.List;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class MongoIndexInitializer {

    private final MongoTemplate mongoTemplate;
    private final MongoMappingContext mongoMappingContext;

    @PostConstruct
    public void initIndexes() {
        createTimeSeriesCollectionIfNotExists();

        List<Class<?>> indexedEntities = List.of(
                Follow.class,
                Heart.class,
                Reaction.class,
                Comment.class,
                CommentLike.class
        );

        IndexResolver resolver = new MongoPersistentEntityIndexResolver(mongoMappingContext);
        for (Class<?> clazz : indexedEntities) {
            try {
                IndexOperations indexOps = mongoTemplate.indexOps(clazz);
                resolver.resolveIndexFor(clazz).forEach(indexOps::ensureIndex);
                log.debug("Indexes ensured for {}", clazz.getSimpleName());
            } catch (Exception e) {
                log.warn("Could not create indexes for {}: {}", clazz.getSimpleName(), e.getMessage());
            }
        }
        log.info("Social-service MongoDB indexes initialized.");
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
            log.warn("Could not create Time Series collection: {}", e.getMessage());
        }
    }
}
