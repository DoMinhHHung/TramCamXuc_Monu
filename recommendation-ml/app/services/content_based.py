import math
from typing import Dict, List

from app.schemas.recommendation import ScoredSong, SongFeatures


def song_to_vector(song: SongFeatures) -> Dict[str, float]:
    """
    Biểu diễn song thành feature vector.
    - Genre features: weight 1.0
    - Artist feature: weight 1.5 (quan trọng hơn genre)
    """
    vec: Dict[str, float] = {}

    for gid in song.genre_ids:
        vec[f"genre:{gid}"] = 1.0

    if song.artist_id:
        vec[f"artist:{song.artist_id}"] = 1.5

    return vec


def cosine_similarity(
        vec_a: Dict[str, float],
        vec_b: Dict[str, float],
) -> float:
    """Cosine similarity giữa 2 feature vectors."""
    if not vec_a or not vec_b:
        return 0.0

    keys = set(vec_a) | set(vec_b)
    dot    = sum(vec_a.get(k, 0.0) * vec_b.get(k, 0.0) for k in keys)
    mag_a  = math.sqrt(sum(v ** 2 for v in vec_a.values()))
    mag_b  = math.sqrt(sum(v ** 2 for v in vec_b.values()))

    if mag_a == 0 or mag_b == 0:
        return 0.0

    return dot / (mag_a * mag_b)


def content_based_filter(
        seed_song: SongFeatures,
        candidates: List[SongFeatures],
        limit: int = 10,
) -> List[ScoredSong]:
    """
    Content-based Filtering:
    - Tính cosine similarity giữa seed và candidates
    - Thêm popularity boost nhẹ
    - Loại chính seed song ra khỏi kết quả
    """
    seed_vec = song_to_vector(seed_song)
    results: List[ScoredSong] = []

    for candidate in candidates:
        if candidate.song_id == seed_song.song_id:
            continue

        cand_vec = song_to_vector(candidate)
        similarity = cosine_similarity(seed_vec, cand_vec)

        if similarity <= 0:
            continue

        # Popularity boost nhẹ để phân biệt khi similarity bằng nhau
        popularity_bonus = 0.0
        if candidate.play_count and candidate.play_count > 0:
            popularity_bonus = math.log10(candidate.play_count) * 0.05

        final_score = round(similarity + popularity_bonus, 4)

        results.append(ScoredSong(
            song_id=candidate.song_id,
            score=final_score,
            reason="content_based",
        ))

    return sorted(results, key=lambda x: x.score, reverse=True)[:limit]


def hybrid_score(
        cf_results: List[ScoredSong],
        cb_results: List[ScoredSong],
        cf_weight: float = 0.6,
        cb_weight: float = 0.4,
) -> List[ScoredSong]:
    """
    Kết hợp CF + CB theo trọng số.
    CF weight cao hơn vì dựa trên hành vi thực tế của user.
    """
    score_map: Dict[str, float] = {}
    reason_map: Dict[str, str] = {}

    for item in cf_results:
        score_map[item.song_id] = score_map.get(item.song_id, 0.0) + item.score * cf_weight
        reason_map[item.song_id] = "collaborative_filtering"

    for item in cb_results:
        score_map[item.song_id] = score_map.get(item.song_id, 0.0) + item.score * cb_weight
        if item.song_id in reason_map:
            reason_map[item.song_id] = "hybrid"
        else:
            reason_map[item.song_id] = "content_based"

    results = [
        ScoredSong(
            song_id=sid,
            score=round(score, 4),
            reason=reason_map[sid],
        )
        for sid, score in score_map.items()
    ]

    return sorted(results, key=lambda x: x.score, reverse=True)