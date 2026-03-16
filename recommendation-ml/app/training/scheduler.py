"""
app/training/scheduler.py

APScheduler chạy training jobs định kỳ.

── Schedule ─────────────────────────────────────────────────────────────────
  Full pipeline (CF + CB): mỗi 6 giờ, lúc 2h / 8h / 14h / 20h
  CF only (nhanh hơn):     mỗi 2 giờ để update recommendations real-time hơn

  Lý do chia:
  - CB (feature matrix) ổn định hơn → train ít hơn (mỗi 6h)
  - CF (user behavior) thay đổi liên tục → train nhiều hơn (mỗi 2h)
"""
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from app.training.pipeline import run_full_pipeline, run_cf_only
from app.core.logging import get_logger

log = get_logger(__name__)

_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="UTC")

        # ── Full pipeline: 2h / 8h / 14h / 20h UTC ───────────────────
        _scheduler.add_job(
            _run_full_pipeline_job,
            trigger=CronTrigger(hour="2,8,14,20", minute=0),
            id="full_training",
            name="Full CF + CB training pipeline",
            max_instances=1,         # không chạy concurrent
            coalesce=True,           # nếu miss → chạy 1 lần thay vì catch up
            misfire_grace_time=300,  # cho phép trễ 5 phút
        )

        # ── CF only: mỗi 2 giờ (offset 1h so với full) ───────────────
        _scheduler.add_job(
            _run_cf_only_job,
            trigger=CronTrigger(hour="1,3,5,7,9,11,13,15,17,19,21,23", minute=0),
            id="cf_training",
            name="CF-only quick training",
            max_instances=1,
            coalesce=True,
            misfire_grace_time=300,
        )

    return _scheduler


async def _run_full_pipeline_job():
    """Wrapper async cho full pipeline."""
    try:
        log.info("scheduled_full_pipeline_start")
        result = await run_full_pipeline()
        log.info("scheduled_full_pipeline_done", result=result)
    except Exception as e:
        log.error("scheduled_full_pipeline_error", error=str(e))


async def _run_cf_only_job():
    """Wrapper async cho CF-only training."""
    try:
        log.info("scheduled_cf_only_start")
        result = await run_cf_only()
        log.info("scheduled_cf_only_done", result=result)
    except Exception as e:
        log.error("scheduled_cf_only_error", error=str(e))