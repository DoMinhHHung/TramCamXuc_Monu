import redis.asyncio as aioredis
import redis as sync_redis
from minio import Minio
from app.core.settings import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)
settings = get_settings()

# ── Redis ─────────────────────────────────────────────────────────────────────

# Async client — dùng trong FastAPI endpoints
_async_redis_pool: aioredis.Redis | None = None

# Sync client — dùng trong training jobs (APScheduler chạy sync)
_sync_redis_client: sync_redis.Redis | None = None


def get_async_redis() -> aioredis.Redis:
    global _async_redis_pool
    if _async_redis_pool is None:
        _async_redis_pool = aioredis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password,
            ssl=settings.redis_ssl,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
    return _async_redis_pool


def get_sync_redis() -> sync_redis.Redis:
    global _sync_redis_client
    if _sync_redis_client is None:
        _sync_redis_client = sync_redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password,
            ssl=settings.redis_ssl,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=30,
            retry_on_timeout=True,
        )
    return _sync_redis_client


# ── MinIO ─────────────────────────────────────────────────────────────────────

_minio_client: Minio | None = None


def _clean_minio_endpoint(raw: str) -> tuple[str, bool]:
    """Strip scheme from endpoint and infer secure flag."""
    secure = settings.minio_secure
    ep = raw.strip().rstrip("/")
    if ep.startswith("https://"):
        ep = ep[len("https://"):]
        secure = True
    elif ep.startswith("http://"):
        ep = ep[len("http://"):]
        secure = False
    return ep, secure


def get_minio() -> Minio:
    global _minio_client
    if _minio_client is None:
        endpoint, secure = _clean_minio_endpoint(settings.minio_endpoint)
        _minio_client = Minio(
            endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=secure,
        )
        # Đảm bảo bucket tồn tại khi khởi động
        _ensure_bucket(_minio_client, settings.minio_bucket)
    return _minio_client


def _ensure_bucket(client: Minio, bucket_name: str) -> None:
    try:
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
            log.info("minio_bucket_created", bucket=bucket_name)
        else:
            log.info("minio_bucket_exists", bucket=bucket_name)
    except Exception as e:
        log.warning("minio_bucket_check_failed", error=str(e))


# ── Redis key constants ────────────────────────────────────────────────────────
# Sync với Spring service để share data qua Redis

class RedisKeys:
    # User embedding vectors từ ALS
    USER_VECTOR = "ml:cf:user:{user_id}"         # JSON list[float]

    # Item embedding vectors từ ALS
    ITEM_VECTOR = "ml:cf:item:{song_id}"         # JSON list[float]

    # Top-N CF results per user (pre-computed)
    CF_TOP_N = "ml:cf:topn:{user_id}"            # JSON list[{songId, score}]

    # Top-N similar songs per song (pre-computed từ CB model)
    CB_SIMILAR = "ml:cb:similar:{song_id}"       # JSON list[{songId, score}]

    # Top-N CB results per user (profile-based)
    CB_TOP_N = "ml:cb:topn:{user_id}"            # JSON list[{songId, score}]

    # Model metadata
    CF_MODEL_VERSION = "ml:meta:cf:version"      # timestamp của lần train gần nhất
    CB_MODEL_VERSION = "ml:meta:cb:version"

    # Song feature vectors từ CB model
    SONG_FEATURES = "ml:cb:features:{song_id}"  # JSON list[float]

    # Index sets để tránh scan toàn keyspace trong request path
    CF_ITEM_INDEX = "ml:cf:item:index"          # Redis Set[song_id]
    CB_FEATURE_INDEX = "ml:cb:features:index"   # Redis Set[song_id]

    @staticmethod
    def user_vector(user_id: str) -> str:
        return f"ml:cf:user:{user_id}"

    @staticmethod
    def item_vector(song_id: str) -> str:
        return f"ml:cf:item:{song_id}"

    @staticmethod
    def cf_topn(user_id: str) -> str:
        return f"ml:cf:topn:{user_id}"

    @staticmethod
    def cb_similar(song_id: str) -> str:
        return f"ml:cb:similar:{song_id}"

    @staticmethod
    def cb_topn(user_id: str) -> str:
        return f"ml:cb:topn:{user_id}"

    @staticmethod
    def song_features(song_id: str) -> str:
        return f"ml:cb:features:{song_id}"

    @staticmethod
    def cf_item_index() -> str:
        return RedisKeys.CF_ITEM_INDEX

    @staticmethod
    def cb_feature_index() -> str:
        return RedisKeys.CB_FEATURE_INDEX