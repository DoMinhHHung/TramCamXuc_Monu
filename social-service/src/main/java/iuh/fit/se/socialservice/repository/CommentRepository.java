package iuh.fit.se.socialservice.repository;

import iuh.fit.se.socialservice.document.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CommentRepository extends MongoRepository<Comment, String> {

    Page<Comment> findBySongIdAndParentIdIsNullOrderByCreatedAtDesc(UUID songId, Pageable pageable);

    Page<Comment> findByParentIdOrderByCreatedAtAsc(String parentId, Pageable pageable);

    long countBySongIdAndParentIdIsNull(UUID songId);

    long countByParentId(String parentId);

    void deleteBySongId(UUID songId);
}
