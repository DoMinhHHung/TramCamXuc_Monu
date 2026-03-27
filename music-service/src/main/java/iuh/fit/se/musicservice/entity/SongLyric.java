package iuh.fit.se.musicservice.entity;

import iuh.fit.se.musicservice.enums.LyricFormat;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Getter @Setter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@Entity
@Table(name = "song_lyrics", indexes = {
        @Index(name = "idx_lyrics_song_id", columnList = "song_id", unique = true),
        @Index(name = "idx_lyrics_search_vector", columnList = "search_vector")
})
public class SongLyric extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "song_id", nullable = false, unique = true)
    private UUID songId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private LyricFormat format;

    @Column(name = "raw_content", columnDefinition = "TEXT")
    private String rawContent;

    @Column(name = "search_content", columnDefinition = "TEXT")
    private String searchContent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "parsed_lines", columnDefinition = "jsonb")
    private String parsedLinesJson;

    @Column(name = "search_vector", columnDefinition = "tsvector",
            insertable = false, updatable = false)
    private String searchVector;
}