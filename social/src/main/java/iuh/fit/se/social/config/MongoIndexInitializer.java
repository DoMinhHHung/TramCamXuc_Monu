package iuh.fit.se.social.config;

import com.mongodb.client.MongoClient;
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

@Configuration
@RequiredArgsConstructor
@Slf4j
public class MongoIndexInitializer {

    private final MongoTemplate mongoTemplate;
    private final MongoMappingContext mongoMappingContext;

    @PostConstruct
    public void initIndexes() {
        for (Class<?> clazz : new Class[]{Follow.class, Heart.class, Reaction.class, Comment.class, CommentLike.class}) {
            IndexOperations indexOps = mongoTemplate.indexOps(clazz);
            IndexResolver resolver = new MongoPersistentEntityIndexResolver(mongoMappingContext);
            resolver.resolveIndexFor(clazz).forEach(indexOps::ensureIndex);
        }
        log.info("Social module MongoDB indexes initialized.");
    }
}