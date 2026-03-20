package iuh.fit.se.socialservice.service.impl;

import iuh.fit.se.socialservice.document.*;
import iuh.fit.se.socialservice.dto.message.FeedContentEvent;
import iuh.fit.se.socialservice.dto.request.FeedPostRequest;
import iuh.fit.se.socialservice.dto.response.FeedPostResponse;
import iuh.fit.se.socialservice.exception.AppException;
import iuh.fit.se.socialservice.exception.ErrorCode;
import iuh.fit.se.socialservice.repository.*;
import iuh.fit.se.socialservice.service.FeedService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeedServiceImpl implements FeedService {

    private static final int  TIMELINE_DAYS = 30;
    private final FeedPostRepository feedPostRepository;
    private final FeedPostLikeRepository feedPostLikeRepository;
    private final CommentRepository commentRepository;
    private final FollowRepository followRepository;
    private final UserFollowRepository userFollowRepository;
    private final MongoTemplate mongoTemplate;
    private final RedisTemplate<String, Object> redisTemplate;
    private static final int  FAMOUS_THRESHOLD = 500;
    private static final String FAMOUS_ARTISTS_KEY = "social:famous:artists";

    // ── Timeline ─────────────────────────────────────────────────────────────

    @Override
    public Page<FeedPostResponse> getTimeline(UUID userId, Pageable pageable) {
        List<UUID> followedArtists = followRepository
                .findArtistIdsByFollowerId(userId)
                .stream().map(Follow::getArtistId).collect(Collectors.toList());

        List<UUID> followedUsers = userFollowRepository
                .findFolloweeIdsByFollowerId(userId)
                .stream().map(UserFollow::getFolloweeId).collect(Collectors.toList());

        Set<UUID> famousArtistIds = getFamousArtistIds();

        Set<UUID> ownerIds = new HashSet<>();
        ownerIds.addAll(followedArtists);
        ownerIds.addAll(followedUsers);
        ownerIds.addAll(famousArtistIds);
        ownerIds.add(userId);

        Instant since = Instant.now().minus(Duration.ofDays(TIMELINE_DAYS));
        List<String> vis = List.of("PUBLIC", "FOLLOWERS_ONLY");

        long total = feedPostRepository.countTimeline(
                new ArrayList<>(ownerIds), vis, since);
        List<FeedPost> posts = feedPostRepository.findTimeline(
                new ArrayList<>(ownerIds), vis, since, pageable);

        return new PageImpl<>(
                posts.stream().map(p -> toResponse(p, userId)).collect(Collectors.toList()),
                pageable, total);
    }

    private Set<UUID> getFamousArtistIds() {
        try {
            Set<Object> raw = redisTemplate.opsForSet().members(FAMOUS_ARTISTS_KEY);
            if (raw == null) return Collections.emptySet();
            return raw.stream()
                    .map(o -> UUID.fromString(o.toString()))
                    .collect(Collectors.toSet());
        } catch (Exception e) {
            log.warn("Failed to read famous artists from Redis: {}", e.getMessage());
            return Collections.emptySet();
        }
    }

    // ── Profile feed ─────────────────────────────────────────────────────────

    @Override
    public Page<FeedPostResponse> getOwnerFeed(UUID ownerId,
                                               UUID viewerId,
                                               Pageable pageable) {
        boolean isOwner = ownerId.equals(viewerId);
        boolean isFollowing = viewerId != null && !isOwner && (
                followRepository.existsByFollowerIdAndArtistId(viewerId, ownerId) ||
                        userFollowRepository.existsByFollowerIdAndFolloweeId(viewerId, ownerId));

        List<String> allowed = new ArrayList<>();
        allowed.add("PUBLIC");
        if (isOwner || isFollowing) allowed.add("FOLLOWERS_ONLY");
        if (isOwner)                allowed.add("PRIVATE");

        return feedPostRepository
                .findByOwnerFiltered(ownerId, allowed, pageable)
                .map(p -> toResponse(p, viewerId));
    }

    @Override
    public Page<FeedPostResponse> getPublicFeed(Pageable pageable) {
        List<String> vis = List.of("PUBLIC");
        Instant since = Instant.now().minus(Duration.ofDays(90));
        long total = feedPostRepository.countPublicFeed(vis, since);
        List<FeedPost> posts = feedPostRepository.findPublicFeed(vis, since, pageable);

        return new PageImpl<>(
                posts.stream().map(p -> toResponse(p, null)).collect(Collectors.toList()),
                pageable, total);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    @Override
    public FeedPostResponse createPost(UUID ownerId, String ownerType,
                                       FeedPostRequest req) {
        FeedPost post = FeedPost.builder()
                .ownerId(ownerId)
                .ownerType(ownerType)
                .contentType(req.getContentType() != null
                        ? req.getContentType() : FeedPost.ContentType.TEXT)
                .contentId(req.getContentId())
                .title(req.getTitle())
                .caption(req.getCaption())
                .coverImageUrl(req.getCoverImageUrl())
                .visibility(req.getVisibility())
                .likeCount(0).commentCount(0).shareCount(0)
                .build();

        return toResponse(feedPostRepository.save(post), ownerId);
    }

    @Override
    public FeedPostResponse updatePost(UUID ownerId, String postId,
                                       FeedPostRequest req) {
        FeedPost post = feedPostRepository.findById(postId)
                .orElseThrow(() -> new AppException(ErrorCode.FEED_POST_NOT_FOUND));

        if (!post.getOwnerId().equals(ownerId)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        if (req.getCaption()    != null) post.setCaption(req.getCaption());
        if (req.getVisibility() != null) post.setVisibility(req.getVisibility());

        return toResponse(feedPostRepository.save(post), ownerId);
    }

    @Override
    public void deletePost(UUID ownerId, String postId) {
        FeedPost post = feedPostRepository.findById(postId)
                .orElseThrow(() -> new AppException(ErrorCode.FEED_POST_NOT_FOUND));
        if (!post.getOwnerId().equals(ownerId)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
                commentRepository.deleteByPostId(postId);
                feedPostLikeRepository.deleteByPostId(postId);
        feedPostRepository.deleteById(postId);
    }

    // ── Like ──────────────────────────────────────────────────────────────────

    @Override
    public void likePost(UUID userId, String postId) {
        feedPostRepository.findById(postId)
                .orElseThrow(() -> new AppException(ErrorCode.FEED_POST_NOT_FOUND));
        if (feedPostLikeRepository.existsByUserIdAndPostId(userId, postId)) {
            throw new AppException(ErrorCode.ALREADY_LIKED_POST);
        }
        feedPostLikeRepository.save(
                FeedPostLike.builder().userId(userId).postId(postId).build());
        // Atomic inc
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("id").is(postId)),
                new Update().inc("likeCount", 1), FeedPost.class);
    }

    @Override
    public void unlikePost(UUID userId, String postId) {
        feedPostRepository.findById(postId)
                .orElseThrow(() -> new AppException(ErrorCode.FEED_POST_NOT_FOUND));
        if (!feedPostLikeRepository.existsByUserIdAndPostId(userId, postId)) return;
        feedPostLikeRepository.deleteByUserIdAndPostId(userId, postId);
        mongoTemplate.updateFirst(
                Query.query(Criteria.where("id").is(postId).and("likeCount").gt(0)),
                new Update().inc("likeCount", -1), FeedPost.class);
    }

    @Override
    public void createFromEvent(FeedContentEvent event) {
        FeedPost.ContentType type = FeedPost.ContentType.valueOf(
                event.getContentType().name());  // ALBUM

        if (feedPostRepository.existsByContentIdAndContentTypeAndOwnerId(
                event.getContentId(), type, event.getArtistId())) {
            log.warn("Feed post already exists, skip. albumId={}", event.getContentId());
            return;
        }

        FeedPost post = FeedPost.builder()
                .ownerId(event.getArtistId())
                .ownerType("ARTIST")
                .contentType(type)
                .contentId(event.getContentId())
                .title(event.getTitle())
                .coverImageUrl(event.getCoverImageUrl())
                .visibility(FeedPost.Visibility.PUBLIC)
                .likeCount(0).commentCount(0).shareCount(0)
                .build();

        feedPostRepository.save(post);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private FeedPostResponse toResponse(FeedPost p, UUID viewerId) {
        boolean liked = viewerId != null &&
                feedPostLikeRepository.existsByUserIdAndPostId(viewerId, p.getId());
        return FeedPostResponse.builder()
                .id(p.getId()).ownerId(p.getOwnerId()).ownerType(p.getOwnerType())
                .contentType(p.getContentType()).contentId(p.getContentId())
                .title(p.getTitle()).caption(p.getCaption())
                .coverImageUrl(p.getCoverImageUrl()).visibility(p.getVisibility())
                .likeCount(p.getLikeCount()).commentCount(p.getCommentCount())
                .shareCount(p.getShareCount()).likedByCurrentUser(liked)
                .createdAt(p.getCreatedAt())
                .build();
    }
}
