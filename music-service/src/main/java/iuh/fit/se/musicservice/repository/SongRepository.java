package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.SongStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SongRepository extends JpaRepository<Song, UUID> {
    Page<Song> findByStatus(SongStatus status, Pageable pageable);
}
