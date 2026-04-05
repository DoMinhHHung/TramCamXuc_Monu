package iuh.fit.se.socialservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

import java.util.List;
import java.util.UUID;
@Configuration
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = "iuh.fit.se.socialservice.repository")
public class MongoConfig {

    @Bean
    public MongoCustomConversions mongoCustomConversions() {
        return new MongoCustomConversions(List.of(
                new UuidToStringConverter(),
                new StringToUuidConverter()
        ));
    }

    @WritingConverter
    static class UuidToStringConverter implements Converter<UUID, String> {
        @Override
        public String convert(UUID source) {
            return source.toString();
        }
    }

    @ReadingConverter
    static class StringToUuidConverter implements Converter<String, UUID> {
        @Override
        public UUID convert(String source) {
            return UUID.fromString(source);
        }
    }
}
