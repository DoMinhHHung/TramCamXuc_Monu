"""
app/api/metrics.py

Theo dõi chất lượng recommendation theo thời gian thực.

Cơ chế:
- Mỗi khi Spring gọi /recommend/*, ta ghi impression vào Redis Hash:
    ml:metrics:impressions:{date} → {userId:songId: timestamp}
- Khi user play bài được recommend (Spring gọi /recommend/feedback),
    ta ghi hit vào Redis Hash:
    ml:metrics:hits:{date} → {userId:songId: 1}
- GET /metrics/hit-rate tính hit_rate = hits / impressions trong 7 ngày
"""
import json
from datetime import datetime, timezone, timedelta
from app.core.clients import get_async_redis, get_sync_redis
from app.core.logging import get_logger

log = get_logger(__name__)

IMPRESSION_KEY_PREFIX = "ml:metrics:impressions"
HIT_KEY_PREFIX = "ml:metrics:hits"
METRICS_TTL_SECONDS = 8 * 24 * 3600  # Giữ 8 ngày


def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def record_impression(user_id: str, song_ids: list[str]) -> None:
    """Ghi lại danh sách bài được recommend cho user."""
    if not song_ids:
        return
    redis = get_async_redis()
    date_str = _today_str()
    key = f"{IMPRESSION_KEY_PREFIX}:{date_str}"
    mapping = {f"{user_id}:{sid}": "1" for sid in song_ids}
    await redis.hset(key, mapping=mapping)
    await redis.expire(key, METRICS_TTL_SECONDS)


async def record_hit(user_id: str, song_id: str) -> None:
    """Ghi lại việc user play bài được recommend (hit)."""
    redis = get_async_redis()
    date_str = _today_str()
    key = f"{HIT_KEY_PREFIX}:{date_str}"
    await redis.hset(key, f"{user_id}:{song_id}", "1")
    await redis.expire(key, METRICS_TTL_SECONDS)


async def get_hit_rate_stats(days: int = 7) -> dict:
    """
    Tính hit rate trong N ngày gần nhất.
    hit_rate = total_hits / total_impressions
    """
    redis = get_async_redis()
    today = datetime.now(timezone.utc).date()

    total_impressions = 0
    total_hits = 0
    daily_stats = []

    for i in range(days):
        date = today - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")

        imp_key = f"{IMPRESSION_KEY_PREFIX}:{date_str}"
        hit_key = f"{HIT_KEY_PREFIX}:{date_str}"

        imp_count = await redis.hlen(imp_key)
        hit_count = await redis.hlen(hit_key)

        total_impressions += imp_count
        total_hits += hit_count

        daily_stats.append({
            "date": date_str,
            "impressions": imp_count,
            "hits": hit_count,
            "hit_rate": round(hit_count / imp_count, 4) if imp_count > 0 else 0.0,
        })

    return {
        "period_days": days,
        "total_impressions": total_impressions,
        "total_hits": total_hits,
        "overall_hit_rate": round(total_hits / total_impressions, 4) if total_impressions > 0 else 0.0,
        "daily": daily_stats,
    }
