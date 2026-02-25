package iuh.fit.se.social.repository;

import iuh.fit.se.social.document.Comment;
import iuh.fit.se.social.enums.TargetType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends MongoRepository<Comment, String> {
    Page<Comment> findByTargetIdAndTargetTypeAndParentIdIsNullAndDeletedFalse(
            UUID targetId, TargetType targetType, Pageable pageable);

    List<Comment> findByParentIdInAndDeletedFalse(List<String> parentIds);

    long countByTargetIdAndTargetTypeAndDeletedFalse(UUID targetId, TargetType targetType);
}