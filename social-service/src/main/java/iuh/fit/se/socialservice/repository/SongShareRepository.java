package iuh.fit.se.socialservice.repository;

import iuh.fit.se.socialservice.document.SongShare;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SongShareRepository extends MongoRepository<SongShare, String> {

    long countBySongId(UUID songId);

    Page<SongShare> findBySongIdOrderByCreatedAtDesc(UUID songId, Pageable pageable);

    /** Tổng share theo artist — dùng cho ArtistStatsResponse */
    long countByArtistId(UUID artistId);
}


