package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.Song;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SongRepository extends JpaRepository<Song, UUID> {
}
