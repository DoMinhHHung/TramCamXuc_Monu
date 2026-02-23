package iuh.fit.se.music.repository;

import iuh.fit.se.music.entity.Artist;
import iuh.fit.se.music.enums.ArtistStatus;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ArtistRepository extends JpaRepository<Artist, UUID> {

    boolean existsByUserId(UUID userId);
    boolean existsByStageName(String stageName);
    Optional<Artist> findByUserId(UUID userId);

    @Query("SELECT a FROM Artist a WHERE " +
            "(:stageName IS NULL OR LOWER(a.stageName) LIKE LOWER(CONCAT('%', :stageName, '%'))) AND " +
            "(:status IS NULL OR a.status = :status)")
    Page<Artist> searchArtists(@Param("stageName") String stageName,
                               @Param("status") ArtistStatus status,
                               Pageable pageable);
}