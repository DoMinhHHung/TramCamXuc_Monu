package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.Album;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AlbumRepository extends JpaRepository<Album, UUID> {
}
