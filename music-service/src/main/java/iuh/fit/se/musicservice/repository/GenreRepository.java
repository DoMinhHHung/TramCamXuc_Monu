package iuh.fit.se.musicservice.repository;

import iuh.fit.se.musicservice.entity.Genre;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GenreRepository extends JpaRepository<Genre, UUID> {
    boolean existsByName(String name);
    boolean existsByNameAndIdNot(String name, UUID id);
    Optional<Genre> findByNameIgnoreCase(String name);

    @Query("""
            SELECT g FROM Genre g
            LEFT JOIN Song s ON g MEMBER OF s.genres
                AND s.deletedAt IS NULL
                AND s.status = 'PUBLIC'
                AND s.transcodeStatus = 'COMPLETED'
            GROUP BY g.id
            HAVING COUNT(s.id) > 0
            ORDER BY COUNT(s.id) DESC, g.name ASC
            """)
    List<Genre> findPopularGenres(Pageable pageable);
}
