package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.SongLyric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SongLyricRepository extends JpaRepository<SongLyric, UUID> {

    Optional<SongLyric> findBySongId(UUID songId);

    boolean existsBySongId(UUID songId);

    @Modifying
    void deleteBySongId(UUID songId);

    @Query(value = """
        SELECT sl.song_id FROM song_lyrics sl
        WHERE sl.search_vector @@ plainto_tsquery('simple', unaccent(:keyword))
        ORDER BY ts_rank(sl.search_vector,
            plainto_tsquery('simple', unaccent(:keyword))) DESC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<UUID> searchByFullText(
            @Param("keyword") String keyword,
            @Param("limit") int limit,
            @Param("offset") int offset);

    @Query(value = """
        SELECT sl.song_id FROM song_lyrics sl
        WHERE sl.search_content ILIKE '%' || unaccent(:keyword) || '%'
        ORDER BY similarity(sl.search_content, unaccent(:keyword)) DESC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<UUID> searchByTrigram(
            @Param("keyword") String keyword,
            @Param("limit") int limit,
            @Param("offset") int offset);
}