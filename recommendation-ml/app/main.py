from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.training.scheduler import get_scheduler
from app.training.pipeline import run_full_pipeline
from app.core.settings import get_settings
from app.core.logging import setup_logging, get_logger
from app.core.clients import get_async_redis, get_minio, get_sync_redis, RedisKeys
from prometheus_fastapi_instrumentator import Instrumentator

settings = get_settings()
log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(debug=settings.debug)
    log.info("service_starting", port=settings.app_port)

    try:
        redis = get_async_redis()
        await redis.ping()
        log.info("redis_connected",
                 host=settings.redis_host,
                 port=settings.redis_port)
    except Exception as e:
        log.error("redis_connection_failed", error=str(e))

    try:
        get_minio()
        log.info("minio_connected", endpoint=settings.minio_endpoint)
    except Exception as e:
        log.warning("minio_connection_failed", error=str(e))

    scheduler = get_scheduler()
    scheduler.start()
    log.info("scheduler_started",
             jobs=[j.id for j in scheduler.get_jobs()])

    try:
        redis = get_sync_redis()
        cf_version = redis.get(RedisKeys.CF_MODEL_VERSION)
        if not cf_version:
            log.info("no_model_found_starting_initial_training")
            asyncio.create_task(_run_initial_training())
        else:
            log.info("existing_model_found",
                     cf_version=cf_version,
                     cb_version=redis.get(RedisKeys.CB_MODEL_VERSION))
    except Exception as e:
        # Do not fail whole app startup when Redis is temporarily unavailable.
        log.error("redis_startup_model_check_failed", error=str(e))

    log.info("service_ready", port=settings.app_port)

    yield

    scheduler.shutdown(wait=False)
    log.info("service_shutdown")


async def _warm_up_social_service():
    """Ping service-social health endpoint to wake it from Render cold start."""
    import httpx
    url = f"{settings.social_service_url}/health"
    for attempt in range(1, 7):
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10, read=60)) as c:
                r = await c.get(url)
                if r.status_code == 200:
                    log.info("social_service_warm", attempt=attempt, url=settings.social_service_url)
                    return True
        except Exception as e:
            log.warning("social_warmup_retry", attempt=attempt, error=str(e))
        await asyncio.sleep(min(attempt * 5, 30))
    log.error("social_service_unreachable_after_warmup")
    return False


async def _run_initial_training():
    try:
        await asyncio.sleep(3)
        log.info("warming_up_social_service")
        ready = await _warm_up_social_service()
        if not ready:
            log.warning("skipping_initial_training_social_unavailable")
            return

        log.info("initial_training_start")
        result = await run_full_pipeline()
        log.info("initial_training_complete", result=result)
    except Exception as e:
        log.error("initial_training_failed", error=str(e))


# ── Application factory ────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title="Recommendation ML Service",
        description=(
            "Python ML service cho music recommendation.\n\n"
            "Endpoints:\n"
            "- `/recommend/cf/{userId}` — Collaborative Filtering (ALS)\n"
            "- `/recommend/cb/{userId}` — Content-Based\n"
            "- `/recommend/similar/{songId}` — Similar songs\n"
            "- `/train` — Trigger training\n"
            "- `/health` — Health + model status\n\n"
            "**Internal only** — không expose ra ngoài, "
            "chỉ gọi từ Spring recommendation-service."
        ),
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    app.include_router(router, tags=["Recommendation"])

    Instrumentator().instrument(app).expose(app)

    return app


app = create_app()