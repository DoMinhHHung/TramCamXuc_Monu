"""
app/training/cf_trainer.py

Collaborative Filtering với Alternating Least Squares (ALS).
Dùng implicit library — được tối ưu cho implicit feedback (nghe nhạc, không phải rating).

── Tại sao ALS thay vì SVD hay Neural? ──────────────────────────────────────
  - ALS scale tốt: O(n_users × k² + n_items × k²) per iteration
  - Implicit: thiết kế cho dữ liệu "user nghe bài X 5 lần" thay vì "user rate 5 sao"
  - Tốc độ: implicit dùng BLAS/LAPACK native → nhanh hơn pure Python 10-100×
  - Đơn giản: ít hyperparameter, dễ debug

── Flow ──────────────────────────────────────────────────────────────────────
  1. Nhận InteractionDataset (sparse matrix)
  2. Train ALS model
  3. Extract user factors (shape: n_users × k) và item factors (shape: n_items × k)
  4. Lưu vào Redis: mỗi user/item vector là một key riêng
  5. Pre-compute top-N per user và lưu cache
  6. Serialize model → upload MinIO (backup + versioning)
"""
import io
import json
import time
import joblib
import numpy as np
import implicit
from implicit.als import AlternatingLeastSquares
from scipy.sparse import csr_matrix
from app.core.settings import get_settings
from app.core.clients import get_sync_redis, get_minio, RedisKeys
from app.data.dataset import InteractionDataset
from app.core.logging import get_logger

log = get_logger(__name__)
settings = get_settings()


class CFTrainer:
    """
    Train và serve Collaborative Filtering model.
    """

    def __init__(self):
        self._model: AlternatingLeastSquares | None = None
        self._dataset: InteractionDataset | None = None

    def train(self, dataset: InteractionDataset) -> dict:
        """
        Train ALS model trên interaction dataset.

        @return: metrics dict {train_time_sec, n_users, n_songs, model_version}
        """
        log.info(
            "cf_training_start",
            n_users=dataset.n_users,
            n_songs=dataset.n_songs,
            n_interactions=dataset.n_interactions,
            factors=settings.cf_factors,
            iterations=settings.cf_iterations,
        )

        start = time.time()

        self._model = AlternatingLeastSquares(
            factors=settings.cf_factors,
            iterations=settings.cf_iterations,
            regularization=settings.cf_regularization,
            alpha=settings.cf_alpha,
            use_gpu=False,
            calculate_training_loss=True,
        )

        # implicit.als.AlternatingLeastSquares nhận user_items matrix
        # (users × items) dạng CSR
        self._model.fit(dataset.matrix)
        self._dataset = dataset

        elapsed = time.time() - start
        model_version = str(int(time.time()))

        log.info(
            "cf_training_complete",
            elapsed_sec=round(elapsed, 2),
            model_version=model_version,
        )

        # Lưu vectors vào Redis và upload model lên MinIO
        self._save_vectors_to_redis(model_version)
        self._upload_model_to_minio(model_version)

        return {
            "train_time_sec": round(elapsed, 2),
            "n_users": dataset.n_users,
            "n_songs": dataset.n_songs,
            "model_version": model_version,
        }

    def _save_vectors_to_redis(self, model_version: str) -> None:
        """
        Lưu user và item factors vào Redis.

        Mỗi vector được store dưới dạng JSON list[float] với TTL.
        Spring service đọc trực tiếp từ các key này.

        Key format (đồng bộ với RedisKeys class):
          ml:cf:user:{userId}   → JSON list[float] (k dims)
          ml:cf:item:{songId}   → JSON list[float] (k dims)
          ml:cf:topn:{userId}   → JSON list[{songId, score}] (pre-computed top-N)
          ml:meta:cf:version    → timestamp string
        """
        redis = get_sync_redis()
        log.info("cf_saving_vectors", n_users=self._dataset.n_users)

        # User factors: model.user_factors shape (n_users, k)
        user_factors = self._model.user_factors
        for idx, user_id in self._dataset.idx_to_user.items():
            vector = user_factors[idx].tolist()
            key = RedisKeys.user_vector(user_id)
            redis.setex(
                key,
                settings.redis_cf_vector_ttl,
                json.dumps(vector),
            )

        # Item factors: model.item_factors shape (n_items, k)
        item_factors = self._model.item_factors
        for idx, song_id in self._dataset.idx_to_song.items():
            vector = item_factors[idx].tolist()
            key = RedisKeys.item_vector(song_id)
            redis.setex(
                key,
                settings.redis_cf_vector_ttl,
                json.dumps(vector),
            )

        # Pre-compute top-N per user và cache
        self._precompute_topn(redis)

        # Model version
        redis.set(RedisKeys.CF_MODEL_VERSION, model_version)

        log.info("cf_vectors_saved",
                 users=self._dataset.n_users,
                 items=self._dataset.n_songs)

    def _precompute_topn(self, redis, top_n: int = 60) -> None:
        """
        Pre-compute top-N recommendations cho mỗi user.

        implicit.recommend() trả về (item_indices, scores) — nhanh hơn
        tính dot product thủ công vì dùng BLAS internally.

        Kết quả được cache với TTL ngắn hơn vectors
        vì top-N thay đổi thường xuyên hơn embeddings.
        """
        log.info("cf_precompute_topn_start", top_n=top_n)

        # item_users: transpose của user_items (required bởi implicit.recommend)
        item_users = self._dataset.matrix.T.tocsr()

        batch_size = 100
        user_indices = list(range(self._dataset.n_users))

        for start in range(0, len(user_indices), batch_size):
            batch = user_indices[start: start + batch_size]

            # recommend trả về (ids_array, scores_array) shape (batch, top_n)
            ids_batch, scores_batch = self._model.recommend(
                batch,
                self._dataset.matrix[batch],
                N=top_n,
                filter_already_liked_items=True,  # loại bài đã nghe
            )

            for i, user_idx in enumerate(batch):
                user_id = self._dataset.idx_to_user[user_idx]
                recommendations = []
                for item_idx, score in zip(ids_batch[i], scores_batch[i]):
                    song_id = self._dataset.idx_to_song.get(int(item_idx))
                    if song_id:
                        recommendations.append({
                            "songId": song_id,
                            "score": float(score),
                        })

                redis.setex(
                    RedisKeys.cf_topn(user_id),
                    settings.redis_result_ttl,
                    json.dumps(recommendations),
                )

        log.info("cf_precompute_topn_done",
                 users_processed=self._dataset.n_users)

    def _upload_model_to_minio(self, model_version: str) -> None:
        """
        Serialize model và upload lên MinIO để backup và rollback.
        Dùng joblib vì nhanh hơn pickle với numpy arrays.
        """
        try:
            buffer = io.BytesIO()
            joblib.dump({
                "model": self._model,
                "user_to_idx": self._dataset.user_to_idx,
                "song_to_idx": self._dataset.song_to_idx,
                "idx_to_user": self._dataset.idx_to_user,
                "idx_to_song": self._dataset.idx_to_song,
            }, buffer)
            buffer.seek(0)
            size = buffer.getbuffer().nbytes

            minio = get_minio()
            object_name = f"cf-model/v{model_version}/model.joblib"
            minio.put_object(
                bucket_name=settings.minio_bucket,
                object_name=object_name,
                data=buffer,
                length=size,
                content_type="application/octet-stream",
            )
            log.info("cf_model_uploaded",
                     object=object_name,
                     size_mb=round(size / 1024 / 1024, 2))
        except Exception as e:
            # Upload thất bại không làm crash training
            log.warning("cf_model_upload_failed", error=str(e))

    def get_recommendations_for_user(
            self, user_id: str, limit: int = 50
    ) -> list[dict]:
        """
        Lấy top-N recommendations cho user từ Redis cache.
        Đây là serving path (không cần model instance).
        """
        redis = get_sync_redis()
        cache_key = RedisKeys.cf_topn(user_id)
        cached = redis.get(cache_key)

        if cached:
            results = json.loads(cached)
            return results[:limit]

        # Cache miss: thử tính real-time nếu có vectors
        return self._realtime_recommend(user_id, limit)

    def _realtime_recommend(self, user_id: str, limit: int) -> list[dict]:
        """
        Real-time recommendation khi cache miss.
        Tính dot product giữa user vector và tất cả item vectors.
        Chậm hơn pre-computed, nhưng đảm bảo user mới luôn có kết quả.
        """
        redis = get_sync_redis()

        # Lấy user vector
        user_vec_raw = redis.get(RedisKeys.user_vector(user_id))
        if not user_vec_raw:
            log.debug("cf_no_user_vector", user_id=user_id)
            return []

        user_vec = np.array(json.loads(user_vec_raw), dtype=np.float32)

        # Lấy tất cả item vectors — dùng pipeline để giảm RTT
        # NOTE: với 100k+ songs, cần pagination. Tạm thời dùng scan.
        item_keys = list(redis.scan_iter("ml:cf:item:*", count=5000))
        if not item_keys:
            return []

        pipe = redis.pipeline()
        for key in item_keys:
            pipe.get(key)
        values = pipe.execute()

        scores = []
        for key, val in zip(item_keys, values):
            if val is None:
                continue
            song_id = key.replace("ml:cf:item:", "")
            item_vec = np.array(json.loads(val), dtype=np.float32)
            score = float(np.dot(user_vec, item_vec))
            scores.append({"songId": song_id, "score": score})

        scores.sort(key=lambda x: x["score"], reverse=True)
        return scores[:limit]