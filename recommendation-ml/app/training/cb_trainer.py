"""
app/training/cb_trainer.py

Content-Based Filtering dùng cosine similarity trên song feature vectors.

── Feature design ────────────────────────────────────────────────────────────
  Mỗi bài hát → vector:
    [genre_multihot (n_genres), log_popularity (1), freshness (1)]

  Đây là dạng "explicit features" khác với ALS (latent factors).
  Ưu điểm: giải thích được, không cần data user để recommend

── User profile ─────────────────────────────────────────────────────────────
  user_profile = weighted_avg(feature_vectors_of_heard_songs)
  → songs có feature_vector gần user_profile nhất → recommend

── Pre-computation strategy ─────────────────────────────────────────────────
  Với 50k songs: cosine similarity matrix = 50k × 50k = 20GB → không khả thi
  → Chỉ compute top-50 similar songs per song và lưu vào Redis
  → User-based CB: compute user profile → real-time top-N khi request

── Serving flow ─────────────────────────────────────────────────────────────
  GET /recommend/cb/{userId}:
    1. Lấy user profile vector từ Redis (hoặc tính từ listen history)
    2. Matrix multiplication: user_profile @ feature_matrix.T
    3. Sort → top-N

  GET /recommend/similar/{songId}:
    1. Lấy từ Redis cb:similar:{songId} (pre-computed)
    2. Nếu không có → compute real-time
"""
import io
import json
import time
import joblib
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from app.core.settings import get_settings
from app.core.clients import get_sync_redis, get_minio, RedisKeys
from app.data.dataset import SongFeatureDataset
from app.core.logging import get_logger

log = get_logger(__name__)
settings = get_settings()


class CBTrainer:
    """
    Train và serve Content-Based model.
    """

    def __init__(self):
        self._dataset: SongFeatureDataset | None = None

    def train(self, dataset: SongFeatureDataset) -> dict:
        """
        "Training" CB thực ra là:
        1. Lưu feature matrix vào Redis (mỗi song một key)
        2. Pre-compute top-50 similar songs per song
        3. Upload dataset lên MinIO

        @return: metrics dict
        """
        log.info(
            "cb_training_start",
            n_songs=len(dataset.song_ids),
            n_features=dataset.feature_matrix.shape[1],
        )

        start = time.time()
        self._dataset = dataset
        model_version = str(int(time.time()))

        redis = get_sync_redis()

        # Step 1: Lưu feature vectors per song
        self._save_song_features(redis)

        # Step 2: Pre-compute similar songs
        self._precompute_similar_songs(redis)

        # Step 3: Upload dataset
        self._upload_to_minio(model_version)

        # Version metadata
        redis.set(RedisKeys.CB_MODEL_VERSION, model_version)

        elapsed = time.time() - start
        log.info("cb_training_complete",
                 elapsed_sec=round(elapsed, 2),
                 model_version=model_version)

        return {
            "train_time_sec": round(elapsed, 2),
            "n_songs": len(dataset.song_ids),
            "n_features": dataset.feature_matrix.shape[1],
            "model_version": model_version,
        }

    def _save_song_features(self, redis) -> None:
        """Lưu feature vector của từng bài hát vào Redis."""
        pipe = redis.pipeline()
        for i, song_id in enumerate(self._dataset.song_ids):
            vector = self._dataset.feature_matrix[i].tolist()
            pipe.setex(
                RedisKeys.song_features(song_id),
                settings.redis_cb_vector_ttl,
                json.dumps(vector),
            )
            # Flush mỗi 500 để tránh pipeline quá lớn
            if (i + 1) % 500 == 0:
                pipe.execute()
                pipe = redis.pipeline()
        pipe.execute()
        log.info("cb_features_saved", n_songs=len(self._dataset.song_ids))

    def _precompute_similar_songs(self, redis, batch_size: int = 500) -> None:
        """
        Pre-compute top-N similar songs per song dùng cosine similarity.

        Xử lý theo batch để tránh memory explosion:
        - Batch 500 songs × toàn bộ matrix (50k songs × 52 features)
        - cosine_similarity(batch, all) → (500, 50k) matrix
        - argpartition (fast top-N) → lấy indices top-50

        Memory estimate:
          500 × 50000 × 4 bytes (float32) ≈ 100MB per batch → chấp nhận được
        """
        feature_matrix = self._dataset.feature_matrix
        song_ids = self._dataset.song_ids
        n_songs = len(song_ids)
        top_n = settings.cb_top_similar

        log.info("cb_precompute_similar_start",
                 n_songs=n_songs, top_n=top_n, batch_size=batch_size)

        pipe = redis.pipeline()
        pipe_count = 0

        for batch_start in range(0, n_songs, batch_size):
            batch_end = min(batch_start + batch_size, n_songs)
            batch_matrix = feature_matrix[batch_start:batch_end]

            # cosine_similarity(A, B) trả về (len(A), len(B)) matrix
            similarities = cosine_similarity(batch_matrix, feature_matrix)

            for local_idx in range(len(batch_matrix)):
                global_idx = batch_start + local_idx
                song_id = song_ids[global_idx]
                sim_row = similarities[local_idx]

                # argpartition: O(n) thay vì O(n log n) của full sort
                # Lấy top_n+1 để loại chính bài đó (similarity = 1.0 với chính mình)
                k = min(top_n + 1, n_songs)
                top_indices = np.argpartition(sim_row, -k)[-k:]
                # Sort phần top_n này (chỉ sort k phần tử, không phải toàn bộ)
                top_indices = top_indices[np.argsort(sim_row[top_indices])[::-1]]

                similar = []
                for idx in top_indices:
                    if idx == global_idx:
                        continue  # bỏ chính bài đó
                    similar.append({
                        "songId": song_ids[idx],
                        "score": round(float(sim_row[idx]), 4),
                    })
                    if len(similar) >= top_n:
                        break

                pipe.setex(
                    RedisKeys.cb_similar(song_id),
                    settings.redis_cb_vector_ttl,
                    json.dumps(similar),
                )
                pipe_count += 1

                if pipe_count >= 200:
                    pipe.execute()
                    pipe = redis.pipeline()
                    pipe_count = 0

            log.debug("cb_batch_done",
                      batch_start=batch_start, batch_end=batch_end)

        if pipe_count > 0:
            pipe.execute()

        log.info("cb_precompute_similar_done", n_songs=n_songs)

    def get_similar_songs(self, song_id: str, limit: int = 20) -> list[dict]:
        """
        Lấy bài hát tương tự từ Redis cache.
        Serving path — không cần model instance.
        """
        redis = get_sync_redis()
        cached = redis.get(RedisKeys.cb_similar(song_id))
        if cached:
            return json.loads(cached)[:limit]

        # Cache miss: real-time computation
        return self._realtime_similar(song_id, limit)

    def get_user_recommendations(
            self,
            user_id: str,
            listen_history: list[dict],
            liked_song_ids: list[str],
            limit: int = 50,
            exclude_ids: set[str] | None = None,
    ) -> list[dict]:
        """
        Tính CB recommendations cho user dựa trên profile vector.

        1. Lấy user profile vector (build từ history hoặc Redis cache)
        2. Tải song feature vectors từ Redis
        3. Cosine similarity → top-N
        """
        redis = get_sync_redis()
        exclude = exclude_ids or set()

        # Lấy tất cả song feature vectors từ Redis
        song_keys = list(redis.scan_iter("ml:cb:features:*", count=10000))
        if not song_keys:
            log.warning("cb_no_features_in_redis")
            return []

        song_ids = [k.replace("ml:cb:features:", "") for k in song_keys]
        pipe = redis.pipeline()
        for key in song_keys:
            pipe.get(key)
        values = pipe.execute()

        # Build feature matrix từ Redis
        rows = []
        valid_ids = []
        for sid, val in zip(song_ids, values):
            if val is None or sid in exclude:
                continue
            rows.append(json.loads(val))
            valid_ids.append(sid)

        if not rows:
            return []

        feature_matrix = np.array(rows, dtype=np.float32)

        # Build user profile từ heard songs
        user_profile = self._build_user_profile(
            listen_history, liked_song_ids, feature_matrix, valid_ids
        )

        if user_profile is None:
            log.debug("cb_no_user_profile", user_id=user_id)
            return []

        # Cosine similarity: user_profile (1, k) × feature_matrix.T (k, n_songs)
        user_vec_2d = user_profile.reshape(1, -1)
        scores = cosine_similarity(user_vec_2d, feature_matrix)[0]

        # Top-N
        k = min(limit * 2, len(valid_ids))
        top_indices = np.argpartition(scores, -k)[-k:]
        top_indices = top_indices[np.argsort(scores[top_indices])[::-1]]

        results = []
        for idx in top_indices:
            results.append({
                "songId": valid_ids[idx],
                "score": round(float(scores[idx]), 4),
            })
            if len(results) >= limit:
                break

        return results

    def _build_user_profile(
            self,
            listen_history: list[dict],
            liked_song_ids: list[str],
            feature_matrix: np.ndarray,
            song_ids: list[str],
    ) -> np.ndarray | None:
        """Build user profile vector từ listen history và liked songs."""
        song_id_to_idx = {sid: i for i, sid in enumerate(song_ids)}
        n_features = feature_matrix.shape[1]

        weighted_sum = np.zeros(n_features, dtype=np.float64)
        total_weight = 0.0

        for item in listen_history:
            sid = item.get("songId")
            if sid not in song_id_to_idx:
                continue
            idx = song_id_to_idx[sid]
            duration = item.get("durationSeconds", 30)
            weight = min(duration / 180.0, 1.0)
            weighted_sum += feature_matrix[idx] * weight
            total_weight += weight

        for sid in liked_song_ids:
            if sid not in song_id_to_idx:
                continue
            idx = song_id_to_idx[sid]
            weighted_sum += feature_matrix[idx] * 2.0
            total_weight += 2.0

        if total_weight == 0:
            return None

        profile = (weighted_sum / total_weight).astype(np.float32)
        norm = np.linalg.norm(profile)
        return profile / norm if norm > 0 else None

    def _realtime_similar(self, song_id: str, limit: int) -> list[dict]:
        """Real-time similar songs khi cache miss."""
        redis = get_sync_redis()
        song_vec_raw = redis.get(RedisKeys.song_features(song_id))
        if not song_vec_raw:
            return []

        song_vec = np.array(json.loads(song_vec_raw), dtype=np.float32)

        # Lấy sample (max 5000 songs) để tính similarity
        sample_keys = list(redis.scan_iter("ml:cb:features:*", count=5000))[:5000]
        sample_ids = [k.replace("ml:cb:features:", "") for k in sample_keys]

        pipe = redis.pipeline()
        for key in sample_keys:
            pipe.get(key)
        values = pipe.execute()

        rows = []
        valid_ids = []
        for sid, val in zip(sample_ids, values):
            if val is None or sid == song_id:
                continue
            rows.append(json.loads(val))
            valid_ids.append(sid)

        if not rows:
            return []

        mat = np.array(rows, dtype=np.float32)
        scores = cosine_similarity(song_vec.reshape(1, -1), mat)[0]
        top_indices = np.argsort(scores)[::-1][:limit]

        return [
            {"songId": valid_ids[i], "score": round(float(scores[i]), 4)}
            for i in top_indices
        ]

    def _upload_to_minio(self, model_version: str) -> None:
        """Upload song feature dataset lên MinIO."""
        try:
            buffer = io.BytesIO()
            joblib.dump({
                "song_ids": self._dataset.song_ids,
                "feature_matrix": self._dataset.feature_matrix,
                "genre_index": self._dataset.genre_index,
                "feature_names": self._dataset.feature_names,
            }, buffer)
            buffer.seek(0)
            size = buffer.getbuffer().nbytes

            get_minio().put_object(
                bucket_name=settings.minio_bucket,
                object_name=f"cb-model/v{model_version}/features.joblib",
                data=buffer,
                length=size,
                content_type="application/octet-stream",
            )
            log.info("cb_model_uploaded",
                     version=model_version,
                     size_mb=round(size / 1024 / 1024, 2))
        except Exception as e:
            log.warning("cb_model_upload_failed", error=str(e))