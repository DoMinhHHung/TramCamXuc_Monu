import math
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List

from app.schemas.recommendation import (
    ListenEvent,
    ScoredSong,
    SongFeatures,
)


def compute_user_song_scores(
        listen_history: List[ListenEvent],
) -> Dict[str, float]:
    """
    Tính implicit score cho từng song user đã nghe.
    Công thức: recency_decay + duration_ratio
    Returns: {song_id: score}
    """
    song_scores: Dict[str, float] = defaultdict(float)
    now = datetime.now(timezone.utc)

    for event in listen_history:
        listened_at = event.listened_at
        if listened_at.tzinfo is None:
            listened_at = listened_at.replace(tzinfo=timezone.utc)

        days_ago = max((now - listened_at).days, 0)
        recency = math.exp(-days_ago / 30.0)

        song_scores[event.song_id] += recency

    return dict(song_scores)


def build_artist_affinity(
        user_scores: Dict[str, float],
        song_map: Dict[str, SongFeatures],
) -> Dict[str, float]:
    """
    Tính artist affinity từ listen history.
    Returns: {artist_id: normalized_score}
    """
    artist_scores: Dict[str, float] = defaultdict(float)

    for song_id, score in user_scores.items():
        feat = song_map.get(song_id)
        if feat and feat.artist_id:
            artist_scores[feat.artist_id] += score

    return _normalize(artist_scores)


def build_genre_affinity(
        user_scores: Dict[str, float],
        song_map: Dict[str, SongFeatures],
) -> Dict[str, float]:
    """
    Tính genre affinity từ listen history.
    Returns: {genre_id: normalized_score}
    """
    genre_scores: Dict[str, float] = defaultdict(float)

    for song_id, score in user_scores.items():
        feat = song_map.get(song_id)
        if not feat:
            continue
        for gid in feat.genre_ids:
            genre_scores[gid] += score

    return _normalize(genre_scores)


def collaborative_filter(
        user_scores: Dict[str, float],
        followed_artist_ids: List[str],
        candidate_song_features: List[SongFeatures],
) -> List[ScoredSong]:
    """
    User-based Collaborative Filtering:
    - Dùng listen history để build artist + genre affinity
    - Score từng candidate song
    - Loại songs đã nghe
    """
    song_map = {s.song_id: s for s in candidate_song_features}
    already_listened = set(user_scores.keys())

    artist_affinity = build_artist_affinity(user_scores, song_map)
    genre_affinity  = build_genre_affinity(user_scores, song_map)

    results: List[ScoredSong] = []

    for feat in candidate_song_features:
        # Loại bỏ songs đã nghe
        if feat.song_id in already_listened:
            continue

        score = 0.0

        # Artist affinity
        if feat.artist_id:
            score += artist_affinity.get(feat.artist_id, 0.0) * 3.0

            # Followed artist bonus
            if feat.artist_id in followed_artist_ids:
                score += 2.0

        # Genre affinity
        for gid in feat.genre_ids:
            score += genre_affinity.get(gid, 0.0) * 2.0

        # Popularity boost (log scale)
        if feat.play_count and feat.play_count > 0:
            score += math.log10(feat.play_count) * 0.3

        if score > 0:
            results.append(ScoredSong(
                song_id=feat.song_id,
                score=round(score, 4),
                reason="collaborative_filtering",
            ))

    return sorted(results, key=lambda x: x.score, reverse=True)


def _normalize(scores: Dict[str, float]) -> Dict[str, float]:
    if not scores:
        return {}
    max_val = max(scores.values(), default=1.0)
    if max_val == 0:
        return scores
    return {k: v / max_val for k, v in scores.items()}