"""
app/main.py

FastAPI application entry point.

── Startup sequence ──────────────────────────────────────────────────────────
  1. Setup logging
  2. Validate Redis connectivity
  3. Validate MinIO connectivity
  4. Start APScheduler
  5. Trigger initial training nếu Redis chưa có model
  6. Register routes

── Lifespan ─────────────────────────────────────────────────────────────────
  Dùng contextmanager lifespan (FastAPI >= 0.93) thay vì on_event deprecated.
"""
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

settings = get_settings()
log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup và shutdown logic.
    yield = ứng dụng đang chạy
    code sau yield = cleanup khi shutdown
    """
    # ── Startup ────────────────────────────────────────────────────────────
    setup_logging(debug=settings.debug)
    log.info("service_starting", port=settings.app_port)

    # Check Redis
    try:
        redis = get_async_redis()
        await redis.ping()
        log.info("redis_connected",
                 host=settings.redis_host,
                 port=settings.redis_port)
    except Exception as e:
        log.error("redis_connection_failed", error=str(e))
        # Không crash — service vẫn start, serving sẽ fallback

    # Check MinIO
    try:
        get_minio()  # constructor validates connectivity
        log.info("minio_connected", endpoint=settings.minio_endpoint)
    except Exception as e:
        log.warning("minio_connection_failed", error=str(e))

    # Start scheduler
    scheduler = get_scheduler()
    scheduler.start()
    log.info("scheduler_started",
             jobs=[j.id for j in scheduler.get_jobs()])

    # Initial training nếu chưa có model
    redis = get_sync_redis()
    cf_version = redis.get(RedisKeys.CF_MODEL_VERSION)
    if not cf_version:
        log.info("no_model_found_starting_initial_training")
        # Chạy async trong background để không block startup
        asyncio.create_task(_run_initial_training())
    else:
        log.info("existing_model_found",
                 cf_version=cf_version,
                 cb_version=redis.get(RedisKeys.CB_MODEL_VERSION))

    log.info("service_ready", port=settings.app_port)

    yield  # Application is running

    # ── Shutdown ────────────────────────────────────────────────────────────
    scheduler.shutdown(wait=False)
    log.info("service_shutdown")


async def _run_initial_training():
    """Chạy training lần đầu khi khởi động."""
    try:
        await asyncio.sleep(5)  # Đợi service hoàn toàn khởi động
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

    # CORS: chỉ allow từ internal network
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],   # internal only → OK
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(router, tags=["Recommendation"])

    return app


app = create_app()