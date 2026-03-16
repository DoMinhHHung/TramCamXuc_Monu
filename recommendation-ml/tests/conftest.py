"""
tests/conftest.py

Shared fixtures dùng cho tất cả test files.
"""
import pytest
import numpy as np
from unittest.mock import MagicMock, AsyncMock, patch


# ── Mock settings (tránh đọc .env trong CI) ───────────────────────────────────

@pytest.fixture(autouse=True)
def mock_settings(monkeypatch):
    """
    Patch settings để test không cần .env file.
    autouse=True → tự động apply cho mọi test.
    """
    from app.core import settings as settings_module
    mock = MagicMock()
    mock.redis_host = "localhost"
    mock.redis_port = 6379
    mock.redis_db = 0
    mock.redis_cf_vector_ttl = 3600
    mock.redis_cb_vector_ttl = 7200
    mock.redis_result_ttl = 1800
    mock.minio_endpoint = "localhost:9000"
    mock.minio_access_key = "test"
    mock.minio_secret_key = "test"
    mock.minio_secure = False
    mock.minio_bucket = "test-bucket"
    mock.cf_factors = 32          # nhỏ hơn cho test nhanh
    mock.cf_iterations = 3
    mock.cf_regularization = 0.01
    mock.cf_alpha = 40.0
    mock.cf_min_interactions = 2
    mock.cb_top_similar = 10
    mock.social_service_url = "http://localhost:8767"
    mock.music_service_url = "http://localhost:8764"
    mock.debug = True
    mock.app_port = 8771
    # Patch get_settings() để trả về mock
    monkeypatch.setattr(
        "app.core.settings.get_settings",
        lambda: mock
    )
    return mock


# ── Sample data factories ──────────────────────────────────────────────────────

@pytest.fixture
def sample_interaction_records():
    """50 interaction records đủ để build một sparse matrix nhỏ."""
    records = []
    for u in range(8):
        for s in range(6):
            if (u + s) % 3 != 0:   # tạo pattern thưa tự nhiên
                records.append({
                    "userId": f"user-{u:02d}",
                    "songId": f"song-{s:02d}",
                    "interactionType": "listen_partial",
                    "weight": float((u + s) % 5 + 1),
                })
    # Thêm một số likes
    for u in range(3):
        records.append({
            "userId": f"user-{u:02d}",
            "songId": f"song-0{u}",
            "interactionType": "like",
            "weight": 8.0,
        })
    return records


@pytest.fixture
def sample_songs():
    """20 song dicts giả lập response từ music-service."""
    songs = []
    genre_names = ["Pop", "Rock", "Jazz", "Electronic", "Lo-fi"]
    for i in range(20):
        songs.append({
            "id": f"song-{i:02d}",
            "title": f"Test Song {i}",
            "playCount": i * 150,
            "createdAt": "2024-03-01T10:00:00",
            "genres": [
                {"id": f"g{i % 5}", "name": genre_names[i % 5]},
            ],
            "primaryArtist": {
                "artistId": f"artist-{i % 4}",
                "stageName": f"Artist {i % 4}",
            },
        })
    return songs


@pytest.fixture
def sample_genres():
    return [
        {"id": "g0", "name": "Pop"},
        {"id": "g1", "name": "Rock"},
        {"id": "g2", "name": "Jazz"},
        {"id": "g3", "name": "Electronic"},
        {"id": "g4", "name": "Lo-fi"},
    ]


@pytest.fixture
def sample_listen_history():
    return [
        {"songId": "song-00", "durationSeconds": 200, "listenedAt": "2024-03-01T10:00:00"},
        {"songId": "song-01", "durationSeconds": 45,  "listenedAt": "2024-03-02T11:00:00"},
        {"songId": "song-02", "durationSeconds": 180, "listenedAt": "2024-03-03T09:00:00"},
        {"songId": "song-03", "durationSeconds": 10,  "listenedAt": "2024-03-04T08:00:00"},
    ]