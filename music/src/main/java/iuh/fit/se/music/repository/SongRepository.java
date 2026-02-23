package iuh.fit.se.music.repository;

import iuh.fit.se.music.entity.Song;
import iuh.fit.se.music.enums.SongStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SongRepository extends JpaRepository<Song, UUID> {

    @Query("""
            SELECT s FROM Song s
            JOIN FETCH s.primaryArtist a
            JOIN FETCH s.genres g
            WHERE s.id = :id AND s.status = 'COMPLETED'
            """)
    java.util.Optional<Song> findPublicById(@Param("id") UUID id);

    @Query("""
            SELECT DISTINCT s FROM Song s
            JOIN FETCH s.primaryArtist a
            LEFT JOIN s.genres g
            WHERE s.status = 'COMPLETED'
            AND (:keyword IS NULL
                OR LOWER(s.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(a.stageName) LIKE LOWER(CONCAT('%', :keyword, '%')))
            AND (:genreId IS NULL OR g.id = :genreId)
            AND (:artistId IS NULL OR a.id = :artistId)
            """)
    Page<Song> searchSongs(
            @Param("keyword") String keyword,
            @Param("genreId") UUID genreId,
            @Param("artistId") UUID artistId,
            Pageable pageable
    );

    @Query("""
            SELECT s FROM Song s
            JOIN FETCH s.primaryArtist
            WHERE s.status = 'COMPLETED'
            ORDER BY s.playCount DESC
            """)
    Page<Song> findTrending(Pageable pageable);

    @Query("""
            SELECT s FROM Song s
            JOIN FETCH s.primaryArtist
            WHERE s.status = 'COMPLETED'
            ORDER BY s.createdAt DESC
            """)
    Page<Song> findNewest(Pageable pageable);

    @Query("""
            SELECT s FROM Song s
            JOIN FETCH s.primaryArtist a
            WHERE s.status = 'COMPLETED'
            AND a.id = :artistId
            """)
    Page<Song> findByArtistId(@Param("artistId") UUID artistId, Pageable pageable);

    @Modifying
    @Query("UPDATE Song s SET s.playCount = s.playCount + :delta WHERE s.id = :id")
    void incrementPlayCount(@Param("id") UUID id, @Param("delta") long delta);
}