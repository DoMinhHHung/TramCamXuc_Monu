"""
app/core/settings.py

Toàn bộ config đọc từ environment variables.
Dùng pydantic-settings để validate type tự động.
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    # ── Service identity ─────────────────────────────────────────────────────
    app_name: str = "recommendation-ml"
    app_port: int = 8771
    debug: bool = False

    # ── Downstream services ──────────────────────────────────────────────────
    # Gọi qua Eureka service name khi trong Docker network
    social_service_url: str = Field(
        default="http://social-service:8767",
        description="URL của social-service để lấy listen history, reactions, follows"
    )
    music_service_url: str = Field(
        default="http://music-service:8764",
        description="URL của music-service để lấy song details, genres"
    )

    # ── Redis ────────────────────────────────────────────────────────────────
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0
    redis_ssl: bool = True
    # TTL cho cached vectors — dài hơn Spring service vì Python tính toán nặng hơn
    redis_cf_vector_ttl: int = 3600 * 24      # 24h — user vectors
    redis_cb_vector_ttl: int = 3600 * 48      # 48h — song feature vectors (ổn định hơn)
    redis_result_ttl: int = 3600              # 1h — cached top-N results per user

    # ── MinIO ────────────────────────────────────────────────────────────────
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "admin"
    minio_secret_key: str = "password123"
    minio_secure: bool = False
    minio_bucket: str = "ml-models"

    # ── ALS Collaborative Filtering ──────────────────────────────────────────
    cf_factors: int = 128          # embedding dimensions — cân bằng accuracy/speed
    cf_iterations: int = 15        # số lần iterate ALS — 15 là sweet spot cho music
    cf_regularization: float = 0.01
    cf_alpha: float = 40.0         # confidence scaling cho implicit feedback
    # Lookback window lấy data training
    cf_train_days: int = 90        # 90 ngày gần nhất
    cf_min_interactions: int = 3   # user phải nghe ít nhất 3 bài mới đưa vào matrix

    # ── Content-Based ────────────────────────────────────────────────────────
    cb_top_similar: int = 50       # lưu top-50 similar songs per song trong Redis
    cb_freshness_decay_days: float = 30.0

    # ── Scheduler ────────────────────────────────────────────────────────────
    training_interval_hours: int = 6    # retrain mỗi 6 giờ
    training_hour: int = 2             # chạy lúc 2h sáng (ít load nhất)

    # ── Batch sizes ──────────────────────────────────────────────────────────
    data_pull_batch_size: int = 1000   # số users mỗi batch khi pull data
    music_batch_size: int = 100        # số songs mỗi batch khi fetch details

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Singleton settings instance.
    lru_cache đảm bảo chỉ parse env một lần.
    """
    return Settings()