"""
app/data/dataset.py

Chuyển raw interaction records → scipy sparse matrix cho ALS
và song feature vectors cho Content-Based model.

── Interaction matrix (CF) ────────────────────────────────────────────────────
  Shape: (n_users, n_songs)
  Value: confidence score = weight × alpha (alpha từ ALS config)
  Type:  scipy.sparse.csr_matrix

── Song feature matrix (CB) ──────────────────────────────────────────────────
  Mỗi bài hát được biểu diễn bởi một vector gồm:
  [genre_onehot (n_genres dims), popularity_score (1 dim), freshness_score (1 dim)]

  Tổng: ~52 dims với 50 genres, đủ nhỏ để cosine_similarity nhanh
  trên 10k+ songs mà không cần approximate search.
"""
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from sklearn.preprocessing import MinMaxScaler
from datetime import datetime, timezone, timedelta
from typing import NamedTuple
from app.core.logging import get_logger

log = get_logger(__name__)


class InteractionDataset(NamedTuple):
    """Dataset cho Collaborative Filtering."""
    # Sparse matrix: rows = users, cols = items
    matrix: csr_matrix
    # Index mappings để convert giữa ID string ↔ matrix index
    user_to_idx: dict[str, int]
    song_to_idx: dict[str, int]
    idx_to_user: dict[int, str]
    idx_to_song: dict[int, str]
    # Stats
    n_users: int
    n_songs: int
    n_interactions: int


class SongFeatureDataset(NamedTuple):
    """Dataset cho Content-Based."""
    feature_matrix: np.ndarray       # shape: (n_songs, n_features)
    song_ids: list[str]              # song_ids[i] tương ứng với row i
    song_to_idx: dict[str, int]
    feature_names: list[str]         # để debug
    genre_index: dict[str, int]      # genre_name → column index


def build_interaction_dataset(
        records: list[dict],
        min_interactions: int = 3,
        alpha: float = 40.0,
) -> InteractionDataset:
    """
    Xây dựng user-item interaction matrix từ raw records.

    @param records: list of {userId, songId, interactionType, weight}
    @param min_interactions: loại bỏ users có < N interactions (quá sparse)
    @param alpha: ALS confidence scaling factor
    """
    if not records:
        raise ValueError("No interaction records provided")

    df = pd.DataFrame(records)

    # Chỉ giữ positive interactions cho matrix (negative sẽ được filter riêng)
    df_positive = df[df["weight"] > 0].copy()

    if df_positive.empty:
        raise ValueError("No positive interactions found")

    # Aggregate: sum weights nếu user nghe cùng bài nhiều lần
    df_agg = (
        df_positive
        .groupby(["userId", "songId"])["weight"]
        .sum()
        .reset_index()
    )

    # Filter users có ít interactions (sparse → làm ALS kém chính xác)
    user_counts = df_agg.groupby("userId")["songId"].count()
    valid_users = user_counts[user_counts >= min_interactions].index
    df_agg = df_agg[df_agg["userId"].isin(valid_users)]

    log.info(
        "dataset_stats",
        total_records=len(records),
        positive_records=len(df_positive),
        users=len(valid_users),
        songs=df_agg["songId"].nunique(),
        interactions=len(df_agg),
    )

    # Build index mappings
    users = sorted(df_agg["userId"].unique())
    songs = sorted(df_agg["songId"].unique())
    user_to_idx = {u: i for i, u in enumerate(users)}
    song_to_idx = {s: i for i, s in enumerate(songs)}

    # Build sparse matrix
    row_idx = df_agg["userId"].map(user_to_idx).values
    col_idx = df_agg["songId"].map(song_to_idx).values
    # ALS confidence = 1 + alpha × weight (implicit library convention)
    confidence_values = 1.0 + alpha * df_agg["weight"].values

    matrix = csr_matrix(
        (confidence_values, (row_idx, col_idx)),
        shape=(len(users), len(songs)),
    )

    return InteractionDataset(
        matrix=matrix,
        user_to_idx=user_to_idx,
        song_to_idx=song_to_idx,
        idx_to_user={i: u for u, i in user_to_idx.items()},
        idx_to_song={i: s for s, i in song_to_idx.items()},
        n_users=len(users),
        n_songs=len(songs),
        n_interactions=len(df_agg),
    )


def build_song_feature_dataset(
        songs: list[dict],
        all_genres: list[dict],
) -> SongFeatureDataset:
    """
    Xây dựng song feature matrix cho Content-Based model.

    Mỗi bài hát → vector gồm:
      - genres: multi-hot encoding (n_genre dims)
      - popularity: log-normalized playCount (1 dim)
      - freshness: exp-decay từ createdAt (1 dim)

    @param songs: list of SongResponse từ music-service
    @param all_genres: list of {id, name} từ /genres endpoint
    """
    if not songs:
        raise ValueError("No songs provided for feature building")

    # Build genre index (stable ordering)
    genre_names = sorted([g["name"] for g in all_genres if g.get("name")])
    genre_index = {name: idx for idx, name in enumerate(genre_names)}
    n_genres = len(genre_names)

    song_ids = []
    feature_rows = []
    now = datetime.now(timezone.utc)

    for song in songs:
        song_id = song.get("id")
        if not song_id:
            continue

        row = np.zeros(n_genres + 2)  # genres + popularity + freshness

        # ── Genre features: multi-hot ──────────────────────────────────────
        song_genres = song.get("genres") or []
        for genre in song_genres:
            genre_name = genre.get("name", "")
            if genre_name in genre_index:
                row[genre_index[genre_name]] = 1.0

        # ── Popularity feature: log-normalized ────────────────────────────
        # log(1 + playCount) → giảm dominance của siêu phổ biến
        # Sẽ được normalize lại về [0,1] bởi MinMaxScaler sau
        play_count = song.get("playCount") or 0
        row[n_genres] = np.log1p(play_count)

        # ── Freshness feature: exp decay ──────────────────────────────────
        # freshness = exp(-age_days / 30)
        created_at_str = song.get("createdAt")
        freshness = 0.5  # default
        if created_at_str:
            try:
                created_at = _parse_datetime(created_at_str)
                age_days = (now - created_at).days
                freshness = np.exp(-age_days / 30.0)
            except (ValueError, TypeError):
                pass
        row[n_genres + 1] = freshness

        song_ids.append(song_id)
        feature_rows.append(row)

    feature_matrix = np.array(feature_rows, dtype=np.float32)

    # Normalize popularity feature (column n_genres) về [0,1]
    # Genre features đã là [0,1], freshness đã là [0,1]
    if len(feature_matrix) > 1:
        scaler = MinMaxScaler()
        feature_matrix[:, n_genres] = scaler.fit_transform(
            feature_matrix[:, n_genres].reshape(-1, 1)
        ).flatten()

    feature_names = genre_names + ["popularity", "freshness"]
    song_to_idx = {sid: i for i, sid in enumerate(song_ids)}

    log.info(
        "feature_matrix_built",
        n_songs=len(song_ids),
        n_features=feature_matrix.shape[1],
        n_genres=n_genres,
    )

    return SongFeatureDataset(
        feature_matrix=feature_matrix,
        song_ids=song_ids,
        song_to_idx=song_to_idx,
        feature_names=feature_names,
        genre_index=genre_index,
    )


def get_user_feature_vector(
        user_id: str,
        listen_history: list[dict],
        liked_song_ids: list[str],
        song_features: SongFeatureDataset,
        favorite_genre_ids: list[str] | None = None,
) -> np.ndarray | None:
    """
    Tạo user profile vector từ listen history và liked songs.

    Cách tính:
      user_vector = weighted_avg(song_vectors_heard)
                  + 2.0 × weighted_avg(song_vectors_liked)
                  (liked = explicit positive → weight cao hơn)

    Nếu có favorite_genre_ids từ identity-service (cold-start):
      → boost các genre dims tương ứng

    @return: user feature vector cùng shape với song features, hoặc None nếu không đủ data
    """
    n_features = song_features.feature_matrix.shape[1]

    # Collect weighted song vectors
    weighted_sum = np.zeros(n_features, dtype=np.float64)
    total_weight = 0.0

    # Listen history → weight theo duration
    for item in listen_history:
        song_id = item.get("songId")
        if song_id not in song_features.song_to_idx:
            continue
        idx = song_features.song_to_idx[song_id]
        duration = item.get("durationSeconds", 30)
        weight = min(duration / 180.0, 1.0)  # max weight = 1.0 tại 3 phút

        weighted_sum += song_features.feature_matrix[idx] * weight
        total_weight += weight

    # Liked songs → weight 2× listen
    for song_id in liked_song_ids:
        if song_id not in song_features.song_to_idx:
            continue
        idx = song_features.song_to_idx[song_id]
        weight = 2.0
        weighted_sum += song_features.feature_matrix[idx] * weight
        total_weight += weight

    if total_weight == 0:
        # Cold-start: dùng favorite genres nếu có
        if favorite_genre_ids:
            vec = np.zeros(n_features, dtype=np.float32)
            for genre_id in favorite_genre_ids:
                if genre_id in song_features.genre_index:
                    vec[song_features.genre_index[genre_id]] = 1.0
            norm = np.linalg.norm(vec)
            return (vec / norm).astype(np.float32) if norm > 0 else None
        return None

    user_vector = (weighted_sum / total_weight).astype(np.float32)
    # L2 normalize để cosine similarity chính xác
    norm = np.linalg.norm(user_vector)
    return (user_vector / norm).astype(np.float32) if norm > 0 else None


def _parse_datetime(dt_str: str) -> datetime:
    """Parse ISO datetime string, handle cả UTC và naive."""
    # music-service trả về "2024-01-15T10:30:00" (naive, assume UTC)
    try:
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        # Fallback: assume now - 30 days
        return datetime.now(timezone.utc) - timedelta(days=30)