"""
tests/test_dataset.py

Unit tests cho data pipeline — không cần network, mock data.
"""
import numpy as np
import pytest
from app.data.dataset import (
    build_interaction_dataset,
    build_song_feature_dataset,
    get_user_feature_vector,
)


# ── Test Interaction Dataset ───────────────────────────────────────────────────

def make_records(n_users=5, n_songs=10, interactions_per_user=5):
    """Tạo mock interaction records."""
    import random
    records = []
    for u in range(n_users):
        songs = random.sample(range(n_songs), min(interactions_per_user, n_songs))
        for s in songs:
            records.append({
                "userId": f"user-{u}",
                "songId": f"song-{s}",
                "interactionType": "listen_partial",
                "weight": random.uniform(1.0, 10.0),
            })
    return records


def test_build_interaction_dataset_basic():
    records = make_records(n_users=10, n_songs=20, interactions_per_user=8)
    dataset = build_interaction_dataset(records, min_interactions=3, alpha=40.0)

    assert dataset.n_users > 0
    assert dataset.n_songs > 0
    assert dataset.n_interactions > 0
    assert dataset.matrix.shape == (dataset.n_users, dataset.n_songs)
    # Matrix values nên > 0 (confidence = 1 + alpha × weight > 0)
    assert dataset.matrix.data.min() > 0


def test_build_interaction_dataset_filters_low_interaction_users():
    # 3 users với ít interactions
    records = [
        {"userId": "user-sparse", "songId": "song-1",
         "interactionType": "listen_partial", "weight": 1.0},
        {"userId": "user-sparse", "songId": "song-2",
         "interactionType": "listen_partial", "weight": 1.0},
    ]
    # Thêm users đủ interactions
    for i in range(5):
        for j in range(5):
            records.append({
                "userId": f"user-active-{i}", "songId": f"song-{j}",
                "interactionType": "listen_partial", "weight": 2.0,
            })

    dataset = build_interaction_dataset(records, min_interactions=3)
    assert "user-sparse" not in dataset.user_to_idx


def test_build_interaction_dataset_aggregates_duplicate_interactions():
    # User nghe cùng bài 3 lần → weights phải được cộng lại
    records = [
        {"userId": "user-1", "songId": "song-1",
         "interactionType": "listen_partial", "weight": 2.0},
        {"userId": "user-1", "songId": "song-1",
         "interactionType": "listen_partial", "weight": 3.0},
        {"userId": "user-1", "songId": "song-1",
         "interactionType": "listen_partial", "weight": 1.0},
        # Thêm đủ interactions để pass min filter
        {"userId": "user-1", "songId": "song-2",
         "interactionType": "listen_partial", "weight": 2.0},
        {"userId": "user-1", "songId": "song-3",
         "interactionType": "listen_partial", "weight": 2.0},
    ]

    dataset = build_interaction_dataset(records, min_interactions=3, alpha=1.0)
    u_idx = dataset.user_to_idx["user-1"]
    s_idx = dataset.song_to_idx["song-1"]

    # confidence = 1 + alpha × aggregated_weight = 1 + 1 × (2+3+1) = 7.0
    assert dataset.matrix[u_idx, s_idx] == pytest.approx(7.0)


def test_build_interaction_dataset_no_data_raises():
    with pytest.raises(ValueError, match="No interaction records"):
        build_interaction_dataset([])


# ── Test Song Feature Dataset ─────────────────────────────────────────────────

def make_songs(n=20):
    songs = []
    for i in range(n):
        songs.append({
            "id": f"song-{i}",
            "title": f"Song {i}",
            "playCount": i * 100,
            "createdAt": "2024-01-15T10:00:00",
            "genres": [
                {"id": f"genre-{i % 3}", "name": ["Pop", "Rock", "Jazz"][i % 3]}
            ],
        })
    return songs


def make_genres():
    return [
        {"id": "g1", "name": "Pop"},
        {"id": "g2", "name": "Rock"},
        {"id": "g3", "name": "Jazz"},
        {"id": "g4", "name": "Electronic"},
    ]


def test_build_song_feature_dataset_shape():
    songs = make_songs(20)
    genres = make_genres()
    dataset = build_song_feature_dataset(songs, genres)

    n_genres = len(genres)
    expected_features = n_genres + 2  # genres + popularity + freshness

    assert len(dataset.song_ids) == 20
    assert dataset.feature_matrix.shape == (20, expected_features)


def test_build_song_feature_dataset_genre_encoding():
    songs = [
        {"id": "s1", "playCount": 0, "createdAt": "2024-01-01T00:00:00",
         "genres": [{"id": "g1", "name": "Pop"}, {"id": "g2", "name": "Rock"}]},
    ]
    genres = make_genres()
    dataset = build_song_feature_dataset(songs, genres)

    # "Pop" index trong genre_index
    pop_idx = dataset.genre_index["Pop"]
    rock_idx = dataset.genre_index["Rock"]
    s_idx = dataset.song_to_idx["s1"]

    assert dataset.feature_matrix[s_idx, pop_idx] == pytest.approx(1.0)
    assert dataset.feature_matrix[s_idx, rock_idx] == pytest.approx(1.0)
    # Electronic không có → 0
    elec_idx = dataset.genre_index["Electronic"]
    assert dataset.feature_matrix[s_idx, elec_idx] == pytest.approx(0.0)


def test_build_song_feature_dataset_feature_range():
    songs = make_songs(10)
    genres = make_genres()
    dataset = build_song_feature_dataset(songs, genres)

    # Tất cả values phải trong [0, 1]
    assert dataset.feature_matrix.min() >= 0.0
    assert dataset.feature_matrix.max() <= 1.0 + 1e-6  # float tolerance


# ── Test User Feature Vector ───────────────────────────────────────────────────

def test_user_feature_vector_from_history():
    songs = make_songs(10)
    genres = make_genres()
    song_dataset = build_song_feature_dataset(songs, genres)

    listen_history = [
        {"songId": "song-0", "durationSeconds": 180},
        {"songId": "song-1", "durationSeconds": 60},
    ]
    liked = ["song-2"]

    vec = get_user_feature_vector("user-1", listen_history, liked, song_dataset)
    assert vec is not None
    assert vec.shape == (song_dataset.feature_matrix.shape[1],)
    # L2 norm ≈ 1 (normalized)
    assert np.linalg.norm(vec) == pytest.approx(1.0, abs=1e-5)


def test_user_feature_vector_cold_start():
    songs = make_songs(10)
    genres = make_genres()
    song_dataset = build_song_feature_dataset(songs, genres)

    # Không có history, không có liked → cold start với favorite genres
    vec = get_user_feature_vector(
        "new-user", [], [], song_dataset,
        favorite_genre_ids=["Pop"]
    )
    assert vec is not None


def test_user_feature_vector_no_data_returns_none():
    songs = make_songs(10)
    genres = make_genres()
    song_dataset = build_song_feature_dataset(songs, genres)

    # Không có gì → None
    vec = get_user_feature_vector("empty-user", [], [], song_dataset)
    assert vec is None