"""
app/data/puller.py

Pull training data từ social-service và music-service.

Các API được gọi:
  social-service:
    GET /internal/social/listen-history/{userId}   → listen events
    GET /internal/social/reactions/{userId}/liked  → liked songs
    GET /internal/social/reactions/{userId}/disliked
    GET /internal/social/follows/{userId}/artists  → followed artists

  music-service:
    GET /songs/batch?ids=...   → song details (genres, artist, playCount)
    GET /songs/trending        → trending songs (seed cho cold-start)
    GET /genres                → all genres (để build genre index)
    GET /artists/popular       → popular artists

Tất cả endpoints đều public hoặc service-to-service (không cần JWT).
social-service /internal/* đã được permit trong SecurityConfig.
"""
import asyncio
from typing import Any
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.settings import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)
settings = get_settings()

# Timeout config: connect nhanh, read đủ lâu cho batch calls
_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0)


class DataPuller:
    """
    Pull data bất đồng bộ từ các downstream services.
    Dùng httpx.AsyncClient với connection pooling.
    """

    def __init__(self):
        self._social_client: httpx.AsyncClient | None = None
        self._music_client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        social_headers = {}
        if settings.internal_service_secret:
            social_headers["X-Internal-Secret"] = settings.internal_service_secret
        self._social_client = httpx.AsyncClient(
            base_url=settings.social_service_url,
            headers=social_headers,
            timeout=_TIMEOUT,
        )
        self._music_client = httpx.AsyncClient(
            base_url=settings.music_service_url,
            timeout=_TIMEOUT,
        )
        return self

    async def __aexit__(self, *args):
        if self._social_client:
            await self._social_client.aclose()
        if self._music_client:
            await self._music_client.aclose()

    # ── Listen History ─────────────────────────────────────────────────────────

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPError),
    )
    async def get_listen_history(
            self, user_id: str, limit: int = 200, days: int = 90
    ) -> list[dict]:
        """
        Lấy listen history của một user.
        social-service trả về list[ListenHistoryResponse]:
          {id, userId, songId, artistId, playlistId, albumId, durationSeconds, listenedAt}
        """
        try:
            resp = await self._social_client.get(
                f"/internal/social/listen-history/{user_id}",
                params={"limit": limit, "days": days},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("result", []) or []
        except httpx.HTTPStatusError as e:
            log.warning("listen_history_fetch_failed",
                        user_id=user_id, status=e.response.status_code)
            return []
        except Exception as e:
            log.warning("listen_history_fetch_error", user_id=user_id, error=str(e))
            return []

    async def get_liked_songs(self, user_id: str) -> list[str]:
        """Trả về list songId mà user đã LIKE."""
        try:
            resp = await self._social_client.get(
                f"/internal/social/reactions/{user_id}/liked"
            )
            resp.raise_for_status()
            return resp.json().get("result", []) or []
        except Exception as e:
            log.warning("liked_songs_fetch_failed", user_id=user_id, error=str(e))
            return []

    async def get_disliked_songs(self, user_id: str) -> list[str]:
        """Trả về list songId mà user đã DISLIKE."""
        try:
            resp = await self._social_client.get(
                f"/internal/social/reactions/{user_id}/disliked"
            )
            resp.raise_for_status()
            return resp.json().get("result", []) or []
        except Exception as e:
            log.warning("disliked_songs_fetch_failed", user_id=user_id, error=str(e))
            return []

    async def get_followed_artists(self, user_id: str) -> list[str]:
        """Trả về list artistId mà user đang follow."""
        try:
            resp = await self._social_client.get(
                f"/internal/social/follows/{user_id}/artists"
            )
            resp.raise_for_status()
            return resp.json().get("result", []) or []
        except Exception as e:
            log.warning("followed_artists_fetch_failed", user_id=user_id, error=str(e))
            return []

    # ── Music Service ──────────────────────────────────────────────────────────

    async def get_songs_batch(self, song_ids: list[str]) -> list[dict]:
        """
        Fetch song details theo batch.
        music-service /songs/batch?ids=id1,id2,...
        Trả về list[SongResponse]: {id, title, genres, primaryArtist, playCount, createdAt, ...}
        """
        if not song_ids:
            return []

        # Chunk để tránh URL quá dài (music-service giới hạn ~100 per request)
        results = []
        chunks = [song_ids[i:i+50] for i in range(0, len(song_ids), 50)]

        for chunk in chunks:
            try:
                resp = await self._music_client.get(
                    "/songs/batch",
                    params={"ids": ",".join(chunk)},
                )
                resp.raise_for_status()
                batch = resp.json().get("result", []) or []
                results.extend(batch)
            except Exception as e:
                log.warning("song_batch_fetch_failed",
                            chunk_size=len(chunk), error=str(e))
        return results

    async def get_all_genres(self) -> list[dict]:
        """
        Lấy toàn bộ genres để build genre index.
        Dùng cho content-based feature engineering.
        """
        try:
            resp = await self._music_client.get("/genres")
            resp.raise_for_status()
            return resp.json().get("result", []) or []
        except Exception as e:
            log.warning("genres_fetch_failed", error=str(e))
            return []

    async def get_popular_artists(self, limit: int = 50) -> list[dict]:
        """Lấy popular artists để seed cold-start."""
        try:
            resp = await self._music_client.get(
                "/artists/popular", params={"limit": limit}
            )
            resp.raise_for_status()
            return resp.json().get("result", []) or []
        except Exception as e:
            log.warning("popular_artists_fetch_failed", error=str(e))
            return []

    async def get_trending_songs(self, page: int = 1, size: int = 200) -> list[dict]:
        """Lấy trending songs — dùng làm cold-start seed và CB training data."""
        try:
            resp = await self._music_client.get(
                "/songs/trending", params={"page": page, "size": size}
            )
            resp.raise_for_status()
            data = resp.json().get("result", {})
            return data.get("content", []) if isinstance(data, dict) else []
        except Exception as e:
            log.warning("trending_fetch_failed", error=str(e))
            return []


class BulkDataPuller:
    """
    Pull data theo batch cho toàn bộ dataset training.

    Chiến lược:
    1. Lấy danh sách user có listen history (từ Redis trending ZSet hoặc user list)
    2. Với mỗi user: pull listen history, likes, dislikes trong một batch
    3. Concurrent fetch với semaphore để tránh overwhelm downstream services
    """

    def __init__(self, puller: DataPuller, max_concurrent: int = 20):
        self.puller = puller
        self._semaphore = asyncio.Semaphore(max_concurrent)

    async def pull_user_interactions(self, user_ids: list[str]) -> list[dict]:
        """
        Pull tất cả interactions cho danh sách users.
        Trả về list records:
          {userId, songId, interactionType, weight, timestamp}

        interactionType: "listen_complete", "listen_partial", "like", "dislike"
        weight: tương ứng với scoring formula trong TrendingScoreService.java
        """
        tasks = [self._pull_one_user(uid) for uid in user_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_records = []
        for res in results:
            if isinstance(res, list):
                all_records.extend(res)
            elif isinstance(res, Exception):
                log.warning("user_pull_failed", error=str(res))

        log.info("bulk_pull_complete",
                 users=len(user_ids), records=len(all_records))
        return all_records

    async def _pull_one_user(self, user_id: str) -> list[dict]:
        async with self._semaphore:
            records = []

            # Listen history → implicit feedback
            history = await self.puller.get_listen_history(user_id)
            for item in history:
                song_id = item.get("songId")
                if not song_id:
                    continue
                duration = item.get("durationSeconds", 0)
                # Map durationSeconds → weight (cùng logic Java TrendingScoreService)
                weight = _calculate_listen_weight(duration, completed=False)
                records.append({
                    "userId": user_id,
                    "songId": song_id,
                    "interactionType": "listen_partial",
                    "weight": weight,
                    "timestamp": item.get("listenedAt", ""),
                })

            # Likes → positive signal mạnh hơn listen
            liked = await self.puller.get_liked_songs(user_id)
            for song_id in liked:
                records.append({
                    "userId": user_id,
                    "songId": song_id,
                    "interactionType": "like",
                    "weight": 8.0,  # like = explicit positive feedback
                    "timestamp": "",
                })

            # Dislikes → negative signal (sẽ được filter, không đưa vào ALS)
            disliked = await self.puller.get_disliked_songs(user_id)
            for song_id in disliked:
                records.append({
                    "userId": user_id,
                    "songId": song_id,
                    "interactionType": "dislike",
                    "weight": -1.0,  # ALS không dùng negative, nhưng giữ để filter
                    "timestamp": "",
                })

            return records


def _calculate_listen_weight(duration_seconds: int, completed: bool) -> float:
    """
    Tính weight cho một sự kiện nghe.
    Đồng bộ với TrendingScoreService.java calculateListenScore().
    """
    base = 1.0
    completion_bonus = 4.0 if completed else 0.0
    duration_bonus = min(duration_seconds / 30.0, 5.0)
    return base + completion_bonus + duration_bonus