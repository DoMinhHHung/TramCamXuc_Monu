from fastapi import APIRouter, Query, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import verify_internal_secret
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
from app.api.metrics import record_impression, record_hit, get_hit_rate_stats
import asyncio
import json
import math

log = get_logger(__name__)
settings = get_settings()

router = APIRouter()

def _normalize_score(value) -> float:
    """
    Ensure score is finite and within [0, 1] to satisfy SongScore schema.
    Some CF pipelines may emit sentinel values (e.g. -3.4e38) or NaN/Inf.
    """
    try:
        x = float(value)
    except Exception:
        return 0.0
    if not math.isfinite(x):
        return 0.0
    if x < 0.0:
        return 0.0
    if x > 1.0:
        return 1.0
    return x

def _to_song_scores(results: list[dict], limit: int) -> list[SongScore]:
    out: list[SongScore] = []
    for r in (results or [])[:limit]:
        song_id = r.get("songId") if isinstance(r, dict) else None
        if not song_id:
            continue
        out.append(SongScore(songId=str(song_id), score=_normalize_score(r.get("score"))))
    return out


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
            recommendations=_to_song_scores(results, limit),
            modelVersion=await redis.get(RedisKeys.CF_MODEL_VERSION) or "",
            source="cache",
        )

    # Cache miss: real-time từ vectors
    # Chuyển sang sync (CF trainer dùng sync Redis để SCAN)
    cf_trainer = get_cf_trainer()
    recommendations = cf_trainer.get_recommendations_for_user(user_id, limit)

    if not recommendations:
        # Cold-start: user chưa có CF vector → fallback trending
        log.info("cf_cold_start_fallback", user_id=user_id)
        redis_sync = get_sync_redis()
        trending_raw = redis_sync.zrevrange("rec:trending:global", 0, limit - 1, withscores=True)
        if trending_raw:
            return RecommendResponse(
                recommendations=[
                    SongScore(songId=str(sid), score=_normalize_score(score))
                    for sid, score in trending_raw
                ],
                source="cold_start_trending",
            )
        return RecommendResponse(recommendations=[], source="no_model")

    result = RecommendResponse(
        recommendations=_to_song_scores(recommendations, limit),
        modelVersion=await redis.get(RedisKeys.CF_MODEL_VERSION) or "",
        source="realtime",
    )
    # Track impressions cho hit-rate monitoring
    asyncio.create_task(record_impression(user_id, [r.songId for r in result.recommendations]))
    return result


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
            recommendations=_to_song_scores(results, limit),
            modelVersion=await redis.get(RedisKeys.CB_MODEL_VERSION) or "",
            source="cache",
        )

    # Pull user data từ social-service
    async with DataPuller() as puller:
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
        # ── Cold-start fallback: user mới, không có lịch sử ──────────────
        # Trả về top-N bài trending từ Redis thay vì empty list
        log.info("cb_cold_start_fallback", user_id=user_id)
        redis_sync = get_sync_redis()
        trending_raw = redis_sync.zrevrange("rec:trending:global", 0, limit - 1, withscores=True)
        if trending_raw:
            cold_start_songs = [
                SongScore(songId=str(sid), score=_normalize_score(score))
                for sid, score in trending_raw
            ]
            return RecommendResponse(
                recommendations=cold_start_songs,
                modelVersion=await redis.get(RedisKeys.CB_MODEL_VERSION) or "",
                source="cold_start_trending",
            )
        return RecommendResponse(recommendations=[], source="no_data")

    # Cache result
    await redis.setex(
        RedisKeys.cb_topn(user_id),
        settings.redis_result_ttl,
        json.dumps([{"songId": r.get("songId"), "score": _normalize_score(r.get("score"))} for r in (recommendations or [])]),
    )

    result = RecommendResponse(
        recommendations=_to_song_scores(recommendations, limit),
        modelVersion=await redis.get(RedisKeys.CB_MODEL_VERSION) or "",
        source="realtime",
    )
    asyncio.create_task(record_impression(user_id, [r.songId for r in result.recommendations]))
    return result


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
        recommendations=_to_song_scores(results, limit),
        modelVersion=await redis.get(RedisKeys.CB_MODEL_VERSION) or "",
        source="cache",
    )


# ── Training Triggers ─────────────────────────────────────────────────────────

@router.post("/train", response_model=TrainResponse, dependencies=[Depends(verify_internal_secret)])
async def trigger_full_training(background_tasks: BackgroundTasks):
    """
    Trigger full CF + CB training pipeline.
    Chạy async trong background — response trả về ngay.
    Yêu cầu header X-Internal-Secret hợp lệ.
    """
    background_tasks.add_task(_run_pipeline_bg)
    return TrainResponse(
        status="training_started",
        metrics={"note": "Training runs in background. Check /health for completion."},
    )


@router.post("/train/cf", response_model=TrainResponse, dependencies=[Depends(verify_internal_secret)])
async def trigger_cf_training(background_tasks: BackgroundTasks):
    """Trigger CF-only training (nhanh hơn, ~2-5 phút). Yêu cầu X-Internal-Secret."""
    background_tasks.add_task(_run_cf_bg)
    return TrainResponse(status="cf_training_started")


@router.post("/train/cb", response_model=TrainResponse, dependencies=[Depends(verify_internal_secret)])
async def trigger_cb_training(background_tasks: BackgroundTasks):
    """Trigger CB-only training. Yêu cầu X-Internal-Secret."""
    background_tasks.add_task(_run_cb_bg)
    return TrainResponse(status="cb_training_started")


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Kiểm tra sức khỏe của service và model freshness.
    Spring service dùng endpoint này để quyết định có gọi Python hay không.
    Luôn trả JSON 200; không để TimeoutError từ Redis (Upstash xa) làm 500.
    """
    redis = get_async_redis()
    details = {}

    redis_ok = False
    try:
        await asyncio.wait_for(redis.ping(), timeout=8.0)
        redis_ok = True
    except Exception as e:
        details["redis_error"] = str(e)

    cf_version = None
    cb_version = None
    cf_count = 0
    cb_count = 0
    if redis_ok:
        try:
            cf_version, cb_version = await asyncio.wait_for(
                asyncio.gather(
                    redis.get(RedisKeys.CF_MODEL_VERSION),
                    redis.get(RedisKeys.CB_MODEL_VERSION),
                ),
                timeout=25.0,
            )
        except Exception as e:
            details["redis_versions_error"] = str(e)

        try:
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


@router.get("/health/health", response_model=HealthResponse)
async def health_check_alias():
    """
    Alias endpoint để Render's health check probe có thể gọi.
    Render probes tại /health/health thay vì /health.
    """
    return await health_check()


# ── Feedback & Metrics ────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    userId: str
    songId: str


@router.post("/recommend/feedback", dependencies=[Depends(verify_internal_secret)])
async def submit_recommendation_feedback(body: FeedbackRequest):
    """
    Được gọi từ recommendation-service khi user play một bài đã được recommend.
    Ghi hit để tính hit-rate theo ngày.
    """
    await record_hit(body.userId, body.songId)
    return {"status": "ok"}


@router.get("/metrics/hit-rate", dependencies=[Depends(verify_internal_secret)])
async def get_metrics(days: int = Query(default=7, ge=1, le=30)):
    """
    Trả về hit-rate của recommendation trong N ngày gần nhất.
    hit_rate = số bài được recommend mà user thực sự play / tổng bài đã recommend.
    """
    stats = await get_hit_rate_stats(days=days)
    return stats


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