from pydantic import BaseModel, Field
from typing import Any


class SongScore(BaseModel):
    songId: str
    score: float = Field(ge=0.0, le=1.0, description="Normalized similarity score")


class RecommendResponse(BaseModel):
    recommendations: list[SongScore]
    modelVersion: str = ""
    source: str = ""   # "cache" | "realtime" | "cold_start"


class TrainRequest(BaseModel):
    force: bool = False   # force retrain ngay cả khi model còn fresh


class TrainResponse(BaseModel):
    status: str
    metrics: dict[str, Any] = {}


class HealthResponse(BaseModel):
    status: str                  # "healthy" | "degraded" | "unhealthy"
    cfModelVersion: str | None = None
    cbModelVersion: str | None = None
    cfVectorsCount: int = 0
    cbFeaturesCount: int = 0
    redisConnected: bool = False
    minioConnected: bool = False
    details: dict[str, Any] = {}