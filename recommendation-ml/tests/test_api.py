"""
tests/test_api.py

Integration tests cho FastAPI endpoints dùng httpx.AsyncClient.
Không cần Redis/MinIO thật — mock các dependencies.
"""
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def mock_redis():
    """Mock async Redis client."""
    redis = AsyncMock()
    redis.ping = AsyncMock(return_value=True)
    redis.get = AsyncMock(return_value=None)
    redis.setex = AsyncMock(return_value=True)
    redis.set = AsyncMock(return_value=True)
    redis.scan_iter = AsyncMock(return_value=iter([]))
    return redis


@pytest.fixture
def mock_cf_trainer():
    trainer = MagicMock()
    trainer.get_recommendations_for_user.return_value = [
        {"songId": "song-abc", "score": 0.95},
        {"songId": "song-def", "score": 0.87},
    ]
    return trainer


@pytest.fixture
def mock_cb_trainer():
    trainer = MagicMock()
    trainer.get_similar_songs.return_value = [
        {"songId": "song-xyz", "score": 0.92},
    ]
    trainer.get_user_recommendations.return_value = [
        {"songId": "song-cb1", "score": 0.88},
    ]
    return trainer


@pytest.mark.asyncio
async def test_health_endpoint():
    """Health endpoint trả về status đúng format."""
    async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        with patch("app.api.routes.get_async_redis") as mock_get_redis, \
                patch("app.api.routes.get_minio") as mock_get_minio:

            mock_redis = AsyncMock()
            mock_redis.ping = AsyncMock()
            mock_redis.get = AsyncMock(return_value="1234567890")
            mock_redis.scan_iter = AsyncMock(
                return_value=_async_iter(["ml:cf:user:u1", "ml:cf:user:u2"])
            )
            mock_get_redis.return_value = mock_redis
            mock_get_minio.return_value = MagicMock(
                bucket_exists=MagicMock(return_value=True)
            )

            resp = await client.get("/health")

    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "cfModelVersion" in data
    assert "redisConnected" in data


@pytest.mark.asyncio
async def test_cf_recommend_cache_hit(mock_redis, mock_cf_trainer):
    """CF endpoint trả về cached result."""
    cached_data = json.dumps([
        {"songId": "song-1", "score": 0.9},
        {"songId": "song-2", "score": 0.8},
    ])
    mock_redis.get = AsyncMock(return_value=cached_data)

    async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        with patch("app.api.routes.get_async_redis", return_value=mock_redis), \
                patch("app.api.routes.get_cf_trainer", return_value=mock_cf_trainer):

            resp = await client.get("/recommend/cf/test-user-id?limit=10")

    assert resp.status_code == 200
    data = resp.json()
    assert "recommendations" in data
    assert data["source"] == "cache"
    assert len(data["recommendations"]) == 2


@pytest.mark.asyncio
async def test_cf_recommend_cache_miss_uses_realtime(mock_redis, mock_cf_trainer):
    """CF endpoint fallback sang real-time khi cache miss."""
    mock_redis.get = AsyncMock(return_value=None)

    async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        with patch("app.api.routes.get_async_redis", return_value=mock_redis), \
                patch("app.api.routes.get_cf_trainer", return_value=mock_cf_trainer):

            resp = await client.get("/recommend/cf/test-user-id")

    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "realtime"
    assert len(data["recommendations"]) == 2


@pytest.mark.asyncio
async def test_similar_songs_not_found_returns_empty(mock_redis, mock_cb_trainer):
    """Similar songs trả về empty list khi không có data."""
    mock_cb_trainer.get_similar_songs.return_value = []

    async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        with patch("app.api.routes.get_async_redis", return_value=mock_redis), \
                patch("app.api.routes.get_cb_trainer", return_value=mock_cb_trainer):

            resp = await client.get("/recommend/similar/nonexistent-song")

    assert resp.status_code == 200
    data = resp.json()
    assert data["recommendations"] == []
    assert data["source"] == "not_found"


@pytest.mark.asyncio
async def test_train_endpoint_returns_202():
    """Train endpoint trả về ngay (background task)."""
    async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        with patch("app.api.routes.run_full_pipeline") as mock_pipeline:
            resp = await client.post("/train")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "training_started"


# ── Helper ────────────────────────────────────────────────────────────────────

async def _async_iter(items):
    for item in items:
        yield item