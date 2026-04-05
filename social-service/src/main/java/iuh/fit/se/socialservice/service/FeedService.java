package iuh.fit.se.socialservice.service;

import iuh.fit.se.socialservice.dto.message.FeedContentEvent;
import iuh.fit.se.socialservice.dto.request.FeedPostRequest;
import iuh.fit.se.socialservice.dto.response.FeedPostResponse;
import org.springframework.data.domain.*;

import java.util.UUID;

public interface FeedService {

    // Timeline của user — posts từ người/artist họ follow
    Page<FeedPostResponse> getTimeline(UUID userId, Pageable pageable);

    // Profile feed của 1 owner (public view)
    Page<FeedPostResponse> getOwnerFeed(UUID ownerId,
                                        UUID viewerId,
                                        Pageable pageable);

    // User/Artist tạo post (share nội dung hoặc viết text)
    FeedPostResponse createPost(UUID ownerId, String ownerType,
                                FeedPostRequest req);

    // Cập nhật caption / visibility
    FeedPostResponse updatePost(UUID ownerId, String postId,
                                FeedPostRequest req);

    void deletePost(UUID ownerId, String postId);

    // Like / Unlike post
    void likePost(UUID userId, String postId);
    void unlikePost(UUID userId, String postId);

    void createFromEvent(FeedContentEvent event);
        // Global public feed
        Page<FeedPostResponse> getPublicFeed(Pageable pageable);
}