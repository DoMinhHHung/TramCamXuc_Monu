package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.AlbumSong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface AlbumSongRepository extends JpaRepository<AlbumSong, UUID> {

    @Modifying
    @Query("delete from AlbumSong asg where asg.song.id = :songId")
    void deleteAllBySongId(@Param("songId") UUID songId);
}
