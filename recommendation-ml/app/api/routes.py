"""
app/api/routes.py

FastAPI routes cho recommendation endpoints.

── Endpoint map ──────────────────────────────────────────────────────────────
  GET  /recommend/cf/{userId}?limit=50        → CF top-N
  GET  /recommend/cb/{userId}?limit=50        → CB top-N
  GET  /recommend/similar/{songId}?limit=20   → Similar songs
  POST /train                                 → Full pipeline trigger
  POST /train/cf                              → CF only trigger
  POST /train/cb                              → CB only trigger
  GET  /health                                → Health + model freshness

── Notes ────────────────────────────────────────────────────────────────────
  - Không có authentication — service này chỉ gọi từ Spring recommendation-service
    trong internal Docker network, không expose ra ngoài
  - Không cần Eureka — Spring service gọi qua direct URL (ml.service.url)
  - Tất cả endpoints async để không block event loop
"""
from fastapi import APIRouter, Query, BackgroundTasks, HTTPException
from app.api.schemas import (
    RecommendResponse, SongScore,
    TrainResponse, HealthResponse,
)
from app.training.pipeline import (
    run_full_pipeline, run_cf_only, run_cb_only,
    get_cf_trainer, get_cb_trainer,
)
from app.data.puller import DataPuller
from app.core.clients import get_async_redis, get_minio, get_sync_redis, RedisKeys
from app.core.settings import get_settings
from app.core.logging import get_logger
import json

log = get_logger(__name__)
settings = get_settings()

router = APIRouter()


# ── CF Recommendations ────────────────────────────────────────────────────────

@router.get("/recommend/cf/{user_id}", response_model=RecommendResponse)
async def get_cf_recommendations(
        user_id: str,
        limit: int = Query(default=50, ge=1, le=200),
):
    """
    Collaborative Filtering recommendations cho một user.

    Flow:
    1. Check Redis cache ml:cf:topn:{userId}
    2. Cache hit → return ngay
    3. Cache miss → real-time inference từ user vector × item vectors
    4. Vẫn miss (user chưa có vector) → return empty (Spring sẽ fallback cold-start)
    """
    redis = get_async_redis()

    # Cache hit
    cached = await redis.get(RedisKeys.cf_topn(user_id))
    if cached:
        results = json.loads(cached)[:limit]
        return RecommendResponse(
            recommendations=[SongScore(**r) for r in results],
            modelVersion=await redis.get(RedisKeys.CF_MODEL_VERSION) or "",
            source="cache",
        )

    # Cache miss: real-time từ vectors
    # Chuyển sang sync (CF trainer dùng sync Redis để SCAN)
    cf_trainer = get_cf_trainer()
    recommendations = cf_trainer.get_recommendations_for_user(user_id, limit)

    if not recommendations:
        return RecommendResponse(
            recommendations=[],
            source="no_model",
        )

    return RecommendResponse(
        recommendations=[
            SongScore(songId=r["songId"], score=min(r["score"], 1.0))
            for r in recommendations[:limit]
        ],
        modelVersion=await redis.get(RedisKeys.CF_MODEL_VERSION) or "",
        source="realtime",
    )


# ── CB Recommendations ────────────────────────────────────────────────────────

@router.get("/recommend/cb/{user_id}", response_model=RecommendResponse)
async def get_cb_recommendations(
        user_id: str,
        limit: int = Query(default=50, ge=1, le=200),
):
    """
    Content-Based recommendations cho user.

    Cần pull listen history và liked songs từ social-service
    để build user profile → cosine similarity với song features.

    Async fetch từ social-service để không block.
    """
    # Check cached CB results
    redis = get_async_redis()
    cached = await redis.get(RedisKeys.cb_topn(user_id))
    if cached:
        results = json.loads(cached)[:limit]
        return RecommendResponse(
            recommendations=[SongScore(**r) for r in results],
            modelVersion=await redis.get(RedisKeys.CB_MODEL_VERSION) or "",
            source="cache",
        )

    # Pull user data từ social-service
    async with DataPuller() as puller:
        import asyncio
        listen_history, liked_songs = await asyncio.gather(
            puller.get_listen_history(user_id, limit=100, days=30),
            puller.get_liked_songs(user_id),
        )

    # Compute CB recommendations
    cb_trainer = get_cb_trainer()
    recommendations = cb_trainer.get_user_recommendations(
        user_id=user_id,
        listen_history=listen_history,
        liked_song_ids=liked_songs,
        limit=limit,
    )

    if not recommendations:
        return RecommendResponse(recommendations=[], source="no_data")

    # Cache result
    await redis.setex(
        RedisKeys.cb_topn(user_id),
        settings.redis_result_ttl,
        json.dumps(recommendations),
    )

    return RecommendResponse(
        recommendations=[
            SongScore(songId=r["songId"], score=min(r["score"], 1.0))
            for r in recommendations[:limit]
        ],
        modelVersion=await redis.get(RedisKeys.CB_MODEL_VERSION) or "",
        source="realtime",
    )


# ── Similar Songs ─────────────────────────────────────────────────────────────

@router.get("/recommend/similar/{song_id}", response_model=RecommendResponse)
async def get_similar_songs(
        song_id: str,
        limit: int = Query(default=20, ge=1, le=100),
):
    """
    Content-based similar songs cho một bài cụ thể.
    Kết quả pre-computed khi train CB model.
    """
    cb_trainer = get_cb_trainer()
    results = cb_trainer.get_similar_songs(song_id, limit)

    if not results:
        # Nếu không có → trả về empty, Spring fallback sang trending
        return RecommendResponse(recommendations=[], source="not_found")

    redis = get_async_redis()
    return RecommendResponse(
        recommendations=[
            SongScore(songId=r["songId"], score=min(r["score"], 1.0))
            for r in results[:limit]
        ],
        modelVersion=await redis.get(RedisKeys.CB_MODEL_VERSION) or "",
        source="cache",
    )


# ── Training Triggers ─────────────────────────────────────────────────────────

@router.post("/train", response_model=TrainResponse)
async def trigger_full_training(background_tasks: BackgroundTasks):
    """
    Trigger full CF + CB training pipeline.
    Chạy async trong background — response trả về ngay.
    """
    background_tasks.add_task(_run_pipeline_bg)
    return TrainResponse(
        status="training_started",
        metrics={"note": "Training runs in background. Check /health for completion."},
    )


@router.post("/train/cf", response_model=TrainResponse)
async def trigger_cf_training(background_tasks: BackgroundTasks):
    """Trigger CF-only training (nhanh hơn, ~2-5 phút)."""
    background_tasks.add_task(_run_cf_bg)
    return TrainResponse(status="cf_training_started")


@router.post("/train/cb", response_model=TrainResponse)
async def trigger_cb_training(background_tasks: BackgroundTasks):
    """Trigger CB-only training."""
    background_tasks.add_task(_run_cb_bg)
    return TrainResponse(status="cb_training_started")


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Kiểm tra sức khỏe của service và model freshness.
    Spring service dùng endpoint này để quyết định có gọi Python hay không.
    """
    redis = get_async_redis()
    details = {}

    # Check Redis
    redis_ok = False
    try:
        await redis.ping()
        redis_ok = True
    except Exception as e:
        details["redis_error"] = str(e)

    # Lấy model versions
    cf_version = await redis.get(RedisKeys.CF_MODEL_VERSION) if redis_ok else None
    cb_version = await redis.get(RedisKeys.CB_MODEL_VERSION) if redis_ok else None

    # Đếm số vectors (sampling để không scan toàn bộ)
    cf_count = 0
    cb_count = 0
    if redis_ok:
        try:
            # scan với count=1 chỉ để check xem có key không
            cf_keys = list(await _async_scan(redis, "ml:cf:user:*", count=100))
            cf_count = len(cf_keys)
            cb_keys = list(await _async_scan(redis, "ml:cb:features:*", count=100))
            cb_count = len(cb_keys)
        except Exception as e:
            details["scan_error"] = str(e)

    # Check MinIO
    minio_ok = False
    try:
        minio = get_minio()
        minio.bucket_exists(settings.minio_bucket)
        minio_ok = True
    except Exception as e:
        details["minio_error"] = str(e)

    # Overall status
    has_cf_model = cf_count > 0
    has_cb_model = cb_count > 0
    if redis_ok and has_cf_model and has_cb_model:
        status = "healthy"
    elif redis_ok:
        status = "degraded"  # Redis OK nhưng chưa có model
    else:
        status = "unhealthy"

    return HealthResponse(
        status=status,
        cfModelVersion=cf_version,
        cbModelVersion=cb_version,
        cfVectorsCount=cf_count,
        cbFeaturesCount=cb_count,
        redisConnected=redis_ok,
        minioConnected=minio_ok,
        details=details,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _run_pipeline_bg():
    try:
        await run_full_pipeline()
    except Exception as e:
        log.error("background_pipeline_failed", error=str(e))


async def _run_cf_bg():
    try:
        await run_cf_only()
    except Exception as e:
        log.error("background_cf_failed", error=str(e))


async def _run_cb_bg():
    try:
        await run_cb_only()
    except Exception as e:
        log.error("background_cb_failed", error=str(e))


async def _async_scan(redis, pattern: str, count: int = 100) -> list[str]:
    """Async scan Redis keys."""
    keys = []
    async for key in redis.scan_iter(pattern, count=count):
        keys.append(key)
        if len(keys) >= count:
            break
    return keys