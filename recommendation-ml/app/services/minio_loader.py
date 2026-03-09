import json
import logging
from io import BytesIO
from typing import List, Dict

from minio import Minio
from minio.error import S3Error

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_minio_client() -> Minio:
    return Minio(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_use_ssl,
    )


def load_training_data(max_objects: int = 50) -> List[Dict]:
    """
    Đọc JSONL files từ MinIO bucket ai-training-data.
    Mỗi dòng là 1 listen event: {userId, songId, artistId, durationSeconds, listenedAt, ...}
    """
    client = get_minio_client()
    records = []

    try:
        objects = client.list_objects(
            settings.minio_bucket_ai,
            recursive=True
        )

        count = 0
        for obj in objects:
            if count >= max_objects:
                break
            if not obj.object_name.endswith(".jsonl"):
                continue

            try:
                response = client.get_object(
                    settings.minio_bucket_ai,
                    obj.object_name
                )
                content = response.read().decode("utf-8")

                for line in content.strip().splitlines():
                    if line.strip():
                        records.append(json.loads(line))

                count += 1
                logger.debug(f"Loaded {obj.object_name}: {len(records)} records total")

            except Exception as e:
                logger.warning(f"Failed to load {obj.object_name}: {e}")

    except S3Error as e:
        logger.warning(f"MinIO error loading training data: {e}")

    return records


def build_user_item_matrix(records: List[Dict]) -> Dict[str, Dict[str, float]]:
    """
    Tạo user-item matrix từ JSONL records.
    Returns: {userId: {songId: implicit_score}}
    """
    import math
    from datetime import datetime, timezone

    matrix: Dict[str, Dict[str, float]] = {}
    now = datetime.now(timezone.utc)

    for r in records:
        user_id = r.get("userId") or r.get("user_id")
        song_id = r.get("songId") or r.get("song_id")
        if not user_id or not song_id:
            continue

        # Recency decay
        try:
            listened_at_str = r.get("listenedAt") or r.get("listened_at", "")
            listened_at = datetime.fromisoformat(
                listened_at_str.replace("Z", "+00:00")
            )
            days_ago = (now - listened_at).days
            recency = math.exp(-days_ago / 30.0)
        except Exception:
            recency = 0.5

        if user_id not in matrix:
            matrix[user_id] = {}

        matrix[user_id][song_id] = matrix[user_id].get(song_id, 0.0) + recency

    return matrix