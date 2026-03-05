package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.Artist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ArtistRepository extends JpaRepository<Artist, UUID> {
    Optional<Artist> findByUserId(UUID userId);
}
