from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket_ai: str = "ai-training-data"
    minio_use_ssl: bool = False
    port: int = 8088

    class Config:
        env_file = ".env"


settings = Settings()