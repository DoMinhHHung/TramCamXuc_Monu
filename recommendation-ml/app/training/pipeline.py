"""
app/training/pipeline.py

Orchestrates toàn bộ training cycle:
  1. Pull interaction data từ social-service
  2. Pull song details từ music-service
  3. Build datasets
  4. Train CF model
  5. Train CB model
  6. Report metrics

Được gọi bởi:
  - APScheduler mỗi 6 giờ (background)
  - POST /train/cf hoặc /train (manual trigger từ admin)
"""
import asyncio
import time
from app.data.puller import DataPuller, BulkDataPuller
from app.data.dataset import (
    build_interaction_dataset,
    build_song_feature_dataset,
)
from app.training.cf_trainer import CFTrainer
from app.training.cb_trainer import CBTrainer
from app.core.settings import get_settings
from app.core.clients import get_sync_redis
from app.core.logging import get_logger

log = get_logger(__name__)
settings = get_settings()

# Singleton trainers — giữ state giữa các lần train
_cf_trainer = CFTrainer()
_cb_trainer = CBTrainer()

# Lock để tránh concurrent training
_training_lock = asyncio.Lock()


async def run_full_pipeline() -> dict:
    """
    Full training pipeline: CF + CB.
    Thread-safe via asyncio.Lock.

    @return: metrics từ cả 2 models
    """
    if _training_lock.locked():
        log.warning("training_already_running")
        return {"status": "already_running"}

    async with _training_lock:
        log.info("pipeline_start")
        start = time.time()
        results = {}

        async with DataPuller() as puller:
            # ── Bước 1: Lấy user list để pull data ───────────────────────
            # Lấy userIds có hoạt động từ Redis trending ZSet
            # (users nghe nhạc gần đây đều để lại dấu vết ở trending ZSet)
            user_ids = await _get_active_user_ids(puller)

            if not user_ids:
                log.warning("no_active_users_found")
                return {"status": "no_data"}

            log.info("active_users_found", count=len(user_ids))

            # ── Bước 2: Pull interactions cho CF ─────────────────────────
            bulk_puller = BulkDataPuller(puller, max_concurrent=20)
            interaction_records = await bulk_puller.pull_user_interactions(user_ids)

            if not interaction_records:
                log.warning("no_interactions_found")
                return {"status": "no_interactions"}

            # ── Bước 3: Train CF ──────────────────────────────────────────
            try:
                dataset = build_interaction_dataset(
                    interaction_records,
                    min_interactions=settings.cf_min_interactions,
                    alpha=settings.cf_alpha,
                )
                cf_metrics = _cf_trainer.train(dataset)
                results["cf"] = cf_metrics
                log.info("cf_training_done", **cf_metrics)
            except Exception as e:
                log.error("cf_training_failed", error=str(e))
                results["cf"] = {"status": "failed", "error": str(e)}

            # ── Bước 4: Lấy song details cho CB ──────────────────────────
            # Thu thập tất cả songIds từ interactions + trending
            all_song_ids = list({
                r["songId"]
                for r in interaction_records
                if r.get("songId") and r.get("weight", 0) > 0
            })

            # Thêm trending songs để CB model biết về bài mới/phổ biến
            trending_songs = await puller.get_trending_songs(size=200)
            trending_ids = [s["id"] for s in trending_songs if s.get("id")]
            all_song_ids = list(set(all_song_ids + trending_ids))

            # Fetch song details từ music-service
            songs = await puller.get_songs_batch(all_song_ids)
            genres = await puller.get_all_genres()

            # ── Bước 5: Train CB ──────────────────────────────────────────
            try:
                cb_dataset = build_song_feature_dataset(songs, genres)
                cb_metrics = _cb_trainer.train(cb_dataset)
                results["cb"] = cb_metrics
                log.info("cb_training_done", **cb_metrics)
            except Exception as e:
                log.error("cb_training_failed", error=str(e))
                results["cb"] = {"status": "failed", "error": str(e)}

        total_elapsed = time.time() - start
        results["total_elapsed_sec"] = round(total_elapsed, 2)
        results["status"] = "complete"

        log.info("pipeline_complete",
                 elapsed_sec=round(total_elapsed, 2),
                 cf_status=results.get("cf", {}).get("model_version", "failed"),
                 cb_status=results.get("cb", {}).get("model_version", "failed"))

        return results


async def run_cf_only() -> dict:
    """Train chỉ CF model — nhanh hơn full pipeline."""
    if _training_lock.locked():
        return {"status": "already_running"}

    async with _training_lock:
        async with DataPuller() as puller:
            user_ids = await _get_active_user_ids(puller)
            if not user_ids:
                return {"status": "no_data"}

            bulk_puller = BulkDataPuller(puller, max_concurrent=20)
            records = await bulk_puller.pull_user_interactions(user_ids)

            dataset = build_interaction_dataset(records,
                                                min_interactions=settings.cf_min_interactions)
            return _cf_trainer.train(dataset)


async def run_cb_only() -> dict:
    """Train chỉ CB model — cần nhiều song data hơn."""
    if _training_lock.locked():
        return {"status": "already_running"}

    async with _training_lock:
        async with DataPuller() as puller:
            songs = await puller.get_trending_songs(size=500)
            genres = await puller.get_all_genres()
            dataset = build_song_feature_dataset(songs, genres)
            return _cb_trainer.train(dataset)


async def _get_active_user_ids(puller: DataPuller) -> list[str]:
    """
    Lấy danh sách userId có hoạt động gần đây.

    Chiến lược:
    1. Đọc từ Redis listen history (Spring TrendingEventConsumer lưu userId
       trong ZSET khi nhận sự kiện) — nhưng chúng ta không có key này.
    2. Fallback: Gọi một endpoint trả về active users.

    Hiện tại: Spring service không expose endpoint user list (vì sensitive).
    → Dùng approach khác: đọc từ Redis scan các key ml:cf:user:* đã có,
      tức là users từ lần train trước. Với lần đầu tiên → cần seed manually.

    TODO: Thêm một Redis SET "ml:active-users" trong Spring service
          khi nhận SongListenEvent → TrendingEventConsumer push userId vào SET.
    """
    redis = get_sync_redis()

    # Đọc active users từ Redis SET (Spring push vào đây)
    active_users = redis.smembers("ml:active-users")
    if active_users:
        return list(active_users)

    # Fallback: users từ model cũ
    existing_keys = list(redis.scan_iter("ml:cf:user:*", count=10000))
    if existing_keys:
        return [k.replace("ml:cf:user:", "") for k in existing_keys]

    log.warning("no_user_source_found",
                hint="Add 'ml:active-users' Redis SET in Spring TrendingEventConsumer")
    return []


def get_cf_trainer() -> CFTrainer:
    return _cf_trainer


def get_cb_trainer() -> CBTrainer:
    return _cb_trainer