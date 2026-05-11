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
import os
from app.data.puller import DataPuller, BulkDataPuller
from app.data.dataset import (
    build_interaction_dataset,
    build_song_feature_dataset,
)
from app.training.cf_trainer import CFTrainer
from app.training.cb_trainer import CBTrainer
from app.core.settings import get_settings
from app.core.clients import get_sync_redis, RedisKeys
from app.core.logging import get_logger

# ── Memory guard ──────────────────────────────────────────────────────────────
# Giới hạn: nếu còn ít hơn MIN_FREE_MB RAM → giảm window training
MIN_FREE_MB = 200
REDUCED_WINDOW_DAYS = 30      # Fallback khi memory thấp (thay vì 90 ngày)
REDUCED_MAX_USERS = 2000       # Giới hạn user khi memory thấp


def _get_free_memory_mb() -> float:
    """Đọc available memory (MB). Fallback về 999 nếu không đọc được."""
    try:
        import resource
        # /proc/meminfo chỉ có trên Linux (container)
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemAvailable:"):
                    kb = int(line.split()[1])
                    return kb / 1024.0
    except Exception:
        pass
    # Fallback: dùng resource module để lấy soft limit (không chính xác bằng)
    try:
        soft, _ = resource.getrlimit(resource.RLIMIT_AS)
        if soft > 0:
            import psutil
            proc = psutil.Process(os.getpid())
            used_mb = proc.memory_info().rss / (1024 * 1024)
            limit_mb = soft / (1024 * 1024)
            return max(0.0, limit_mb - used_mb)
    except Exception:
        pass
    return 999.0  # Không đọc được → assume OK

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

        # ── Memory check trước khi bắt đầu ──────────────────────────────
        free_mb = _get_free_memory_mb()
        memory_constrained = free_mb < MIN_FREE_MB
        if memory_constrained:
            log.warning("pipeline_memory_constrained",
                        free_mb=round(free_mb, 1),
                        fallback_window_days=REDUCED_WINDOW_DAYS,
                        fallback_max_users=REDUCED_MAX_USERS)
        else:
            log.info("pipeline_memory_ok", free_mb=round(free_mb, 1))

        async with DataPuller() as puller:
            # ── Bước 1: Lấy user list để pull data ───────────────────────
            user_ids = await _get_active_user_ids(puller)

            if not user_ids:
                log.warning("no_active_users_found")
                return {"status": "no_data"}

            # Giới hạn số user khi memory thấp
            if memory_constrained and len(user_ids) > REDUCED_MAX_USERS:
                log.warning("pipeline_user_cap_applied",
                            original=len(user_ids), capped=REDUCED_MAX_USERS)
                user_ids = user_ids[:REDUCED_MAX_USERS]

            log.info("active_users_found", count=len(user_ids))

            # ── Bước 2: Pull interactions cho CF ─────────────────────────
            # Khi memory thấp: pull ít concurrent hơn để tránh spike
            max_concurrent = 10 if memory_constrained else 20
            bulk_puller = BulkDataPuller(puller, max_concurrent=max_concurrent)
            interaction_records = await bulk_puller.pull_user_interactions(
                user_ids,
                days=REDUCED_WINDOW_DAYS if memory_constrained else settings.cf_train_days,
            )

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
        results["memory_constrained"] = memory_constrained
        results["free_mb_at_start"] = round(free_mb, 1)

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
    redis = get_sync_redis()

    # 1. Redis SET từ Spring (primary)
    active_users = redis.smembers("ml:active-users")
    if active_users:
        return list(active_users)[:5000]  # cap để tránh quá lớn

    # 2. Serving/training path không scan keyspace: chỉ kiểm tra index set đã maintain.
    indexed_items = redis.smembers(RedisKeys.CF_ITEM_INDEX)
    if indexed_items:
        log.warning("active_users_set_missing_but_cf_item_index_exists",
                    item_count=len(indexed_items))
        return []

    # 3. Không còn SCAN fallback để tránh chậm ở serving/training path.
    log.warning("no_active_user_source_found")
    return []


def get_cf_trainer() -> CFTrainer:
    return _cf_trainer


def get_cb_trainer() -> CBTrainer:
    return _cb_trainer