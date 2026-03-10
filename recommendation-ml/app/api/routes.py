import time
from typing import List

from fastapi import APIRouter

from app.schemas.recommendation import (
    RecommendRequest,
    RecommendResponse,
    SimilarRequest,
    ScoredSong,
)
from app.services.collaborative import (
    compute_user_song_scores,
    collaborative_filter,
)
from app.services.content_based import (
    content_based_filter,
    hybrid_score,
)

router = APIRouter()


# ── POST /ml/recommend/for-you ────────────────────────────────────────────────

@router.post("/recommend/for-you", response_model=RecommendResponse)
def recommend_for_you(request: RecommendRequest):
    """
    Personalized recommendation:
    1. Tính user song scores từ listen history
    2. Nếu cold-start (không có history), dùng favorites để recommend
    3. Collaborative Filtering → scored candidates
    4. Content-based từ top listened songs → more candidates
    5. Hybrid merge CF + CB
    6. Trả về top N
    """
    start = time.time()

    song_map = {s.song_id: s for s in request.candidate_song_features}

    # Step 1: User implicit scores từ listen history
    user_scores = compute_user_song_scores(request.listen_history)

    # Step 2: Cold-start check - nếu không có history, dùng favorites
    if not user_scores and (request.favorite_genre_ids or request.favorite_artist_ids):
        favorite_results = []
        for song in request.candidate_song_features:
            score = 0.0
            reasons = []

            # Check artist match
            if song.artist_id and song.artist_id in request.favorite_artist_ids:
                score += 0.6
                reasons.append("favorite_artist")

            # Check genre match
            matching_genres = set(song.genre_ids) & set(request.favorite_genre_ids)
            if matching_genres:
                score += 0.4 * (len(matching_genres) / max(len(request.favorite_genre_ids), 1))
                reasons.append("favorite_genre")

            if score > 0:
                favorite_results.append(ScoredSong(
                    song_id=song.song_id,
                    score=score,
                    reason="cold_start_" + "_".join(reasons)
                ))

        # Sort by score và lấy top N
        favorite_results.sort(key=lambda x: x.score, reverse=True)
        elapsed = (time.time() - start) * 1000
        return RecommendResponse(
            user_id=request.user_id,
            songs=favorite_results[:request.limit],
            strategy="cold_start_favorites",
            compute_time_ms=round(elapsed, 2),
        )

    # Step 3: Collaborative Filtering
    cf_results = collaborative_filter(
        user_scores=user_scores,
        followed_artist_ids=request.followed_artist_ids,
        candidate_song_features=request.candidate_song_features,
    )

    # Step 4: Content-based từ top 3 bài user nghe nhiều nhất
    cb_results: List[ScoredSong] = []
    top_listened = sorted(user_scores.items(), key=lambda x: x[1], reverse=True)[:3]

    for song_id, _ in top_listened:
        seed = song_map.get(song_id)
        if seed is None:
            continue
        cb = content_based_filter(
            seed_song=seed,
            candidates=request.candidate_song_features,
            limit=10,
        )
        cb_results.extend(cb)

    # Step 5: Hybrid merge
    if cf_results and cb_results:
        merged = hybrid_score(
            cf_results=cf_results,
            cb_results=cb_results,
            cf_weight=0.6,
            cb_weight=0.4,
        )
        strategy = "hybrid"
    elif cf_results:
        merged = cf_results
        strategy = "collaborative_filtering"
    elif cb_results:
        merged = cb_results
        strategy = "content_based"
    else:
        merged = []
        strategy = "empty"

    # Step 6: Deduplicate + lấy top N
    seen = set()
    final: List[ScoredSong] = []
    for item in merged:
        if item.song_id not in seen:
            seen.add(item.song_id)
            final.append(item)
        if len(final) >= request.limit:
            break

    elapsed = (time.time() - start) * 1000

    return RecommendResponse(
        user_id=request.user_id,
        songs=final,
        strategy=strategy,
        compute_time_ms=round(elapsed, 2),
    )


# ── POST /ml/recommend/similar ────────────────────────────────────────────────

@router.post("/recommend/similar", response_model=RecommendResponse)
def recommend_similar(request: SimilarRequest):
    """
    Content-based: tìm songs tương tự seed_song.
    """
    start = time.time()

    results = content_based_filter(
        seed_song=request.seed_song,
        candidates=request.candidates,
        limit=request.limit,
    )

    elapsed = (time.time() - start) * 1000

    return RecommendResponse(
        user_id="anonymous",
        songs=results,
        strategy="content_based",
        compute_time_ms=round(elapsed, 2),
    )


# ── GET /ml/health ────────────────────────────────────────────────────────────

@router.get("/health")
def health():
    return {"status": "ok", "service": "recommendation-ml"}