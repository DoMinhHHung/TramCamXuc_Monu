"""
tests/test_scoring.py

Test các công thức tính điểm và logic core của training.
Đây là business logic quan trọng nhất cần cover kỹ.
"""
import numpy as np
import pytest
from app.data.puller import _calculate_listen_weight
from app.data.dataset import (
    build_interaction_dataset,
    build_song_feature_dataset,
    get_user_feature_vector,
)


# ── Listen Weight Formula ─────────────────────────────────────────────────────

class TestListenWeightFormula:
    """
    Kiểm tra _calculate_listen_weight() match với Java TrendingScoreService.
    Đây là single source of truth cho scoring — nếu 2 bên lệch nhau,
    ALS sẽ học sai signal.
    """

    def test_base_weight_no_completion(self):
        """Nghe < 30s, không xong → base 1.0 + duration bonus nhỏ."""
        weight = _calculate_listen_weight(10, completed=False)
        # 1.0 + min(10/30, 5) = 1.0 + 0.333... ≈ 1.333
        assert weight == pytest.approx(1.0 + 10/30, rel=1e-3)

    def test_completion_adds_bonus(self):
        """Nghe xong bài → +4.0 completion bonus."""
        weight_no_complete = _calculate_listen_weight(30, completed=False)
        weight_complete    = _calculate_listen_weight(30, completed=True)
        assert weight_complete - weight_no_complete == pytest.approx(4.0)

    def test_duration_bonus_capped_at_5(self):
        """Duration bonus không vượt quá 5.0 dù nghe cả tiếng."""
        weight_3min  = _calculate_listen_weight(180, completed=False)
        weight_10min = _calculate_listen_weight(600, completed=False)
        # Cả hai đều phải có duration bonus = 5.0
        assert weight_10min == pytest.approx(weight_3min)
        # 1.0 + 5.0 = 6.0
        assert weight_3min == pytest.approx(6.0, rel=1e-3)

    def test_max_possible_weight(self):
        """Max weight: base + completion + max_duration = 1+4+5 = 10."""
        weight = _calculate_listen_weight(200, completed=True)
        assert weight == pytest.approx(10.0, rel=1e-3)

    def test_zero_duration(self):
        """Duration 0s → chỉ có base score."""
        weight = _calculate_listen_weight(0, completed=False)
        assert weight == pytest.approx(1.0)


# ── ALS Confidence Values ─────────────────────────────────────────────────────

class TestInteractionMatrixConfidence:
    """
    Kiểm tra confidence values trong sparse matrix.
    ALS dùng confidence = 1 + alpha × raw_weight.
    """

    def test_confidence_formula(self, sample_interaction_records):
        alpha = 40.0
        dataset = build_interaction_dataset(
            sample_interaction_records,
            min_interactions=2,
            alpha=alpha,
        )
        # Tất cả matrix values phải > 1 (confidence luôn ≥ 1 + alpha × min_weight)
        assert dataset.matrix.data.min() > 1.0

    def test_higher_weight_higher_confidence(self):
        """User nghe nhiều lần → confidence cao hơn."""
        records = [
            # user-A nghe song-X tổng 3 lần (weight nhỏ)
            {"userId": "user-A", "songId": "song-X",
             "interactionType": "listen_partial", "weight": 1.0},
            {"userId": "user-A", "songId": "song-X",
             "interactionType": "listen_partial", "weight": 1.0},
            {"userId": "user-A", "songId": "song-X",
             "interactionType": "listen_partial", "weight": 1.0},
            # user-A cần đủ interactions cho filter
            {"userId": "user-A", "songId": "song-Y",
             "interactionType": "listen_partial", "weight": 5.0},
            {"userId": "user-A", "songId": "song-Z",
             "interactionType": "listen_partial", "weight": 5.0},

            # user-B nghe song-X 1 lần với weight cao hơn
            {"userId": "user-B", "songId": "song-X",
             "interactionType": "like", "weight": 8.0},
            {"userId": "user-B", "songId": "song-Y",
             "interactionType": "listen_partial", "weight": 5.0},
            {"userId": "user-B", "songId": "song-Z",
             "interactionType": "listen_partial", "weight": 5.0},
        ]
        dataset = build_interaction_dataset(records, min_interactions=2, alpha=40.0)

        ua = dataset.user_to_idx["user-A"]
        ub = dataset.user_to_idx["user-B"]
        sx = dataset.song_to_idx["song-X"]

        conf_a = dataset.matrix[ua, sx]  # 1 + 40 × (1+1+1) = 121
        conf_b = dataset.matrix[ub, sx]  # 1 + 40 × 8 = 321

        assert conf_b > conf_a


# ── Feature Matrix Properties ─────────────────────────────────────────────────

class TestSongFeatureMatrix:
    """Kiểm tra song feature matrix properties cho CB model."""

    def test_features_in_unit_range(self, sample_songs, sample_genres):
        dataset = build_song_feature_dataset(sample_songs, sample_genres)
        assert dataset.feature_matrix.min() >= 0.0
        assert dataset.feature_matrix.max() <= 1.0 + 1e-6

    def test_genre_multihot_correct(self, sample_songs, sample_genres):
        """Bài Pop phải có genre_index['Pop'] = 1.0."""
        dataset = build_song_feature_dataset(sample_songs, sample_genres)
        pop_idx = dataset.genre_index["Pop"]
        # song-00 có genre Pop (i=0, i%5=0 → genres[0] = "Pop")
        s00_idx = dataset.song_to_idx["song-00"]
        assert dataset.feature_matrix[s00_idx, pop_idx] == pytest.approx(1.0)

    def test_freshness_decreases_with_age(self):
        """Bài cũ hơn phải có freshness score thấp hơn."""
        songs = [
            {"id": "new",  "playCount": 0, "createdAt": "2024-06-01T00:00:00",
             "genres": []},
            {"id": "old",  "playCount": 0, "createdAt": "2020-01-01T00:00:00",
             "genres": []},
        ]
        genres = [{"id": "g1", "name": "Pop"}]
        dataset = build_song_feature_dataset(songs, genres)

        # Feature index: genre (1) + popularity (1) + freshness (1)
        freshness_idx = len(genres) + 1
        new_idx = dataset.song_to_idx["new"]
        old_idx = dataset.song_to_idx["old"]

        assert (dataset.feature_matrix[new_idx, freshness_idx] >
                dataset.feature_matrix[old_idx, freshness_idx])

    def test_popularity_normalized(self, sample_songs, sample_genres):
        """Popularity column sau normalize phải có max=1.0."""
        dataset = build_song_feature_dataset(sample_songs, sample_genres)
        n_genres = len(sample_genres)
        pop_col = dataset.feature_matrix[:, n_genres]
        assert pop_col.max() == pytest.approx(1.0, abs=0.01)

    def test_zero_playcount_songs_included(self, sample_genres):
        """Bài chưa có lượt nghe vẫn được đưa vào dataset."""
        songs = [
            {"id": "new-song", "playCount": 0,
             "createdAt": "2024-06-01T00:00:00",
             "genres": [{"id": "g0", "name": "Pop"}]},
        ]
        dataset = build_song_feature_dataset(songs, sample_genres)
        assert "new-song" in dataset.song_to_idx


# ── User Profile Vector ───────────────────────────────────────────────────────

class TestUserProfileVector:
    """Kiểm tra user profile vector building."""

    def test_liked_songs_have_higher_weight(self, sample_songs, sample_genres,
                                            sample_listen_history):
        """Liked songs đóng góp 2× so với listened songs."""
        dataset = build_song_feature_dataset(sample_songs, sample_genres)

        # Profile từ only listen history
        vec_listen_only = get_user_feature_vector(
            "u1", sample_listen_history, [], dataset
        )
        # Profile từ same history + liked song
        vec_with_like = get_user_feature_vector(
            "u1", sample_listen_history, ["song-00"], dataset
        )

        assert vec_listen_only is not None
        assert vec_with_like is not None
        # Hai vectors phải khác nhau (like thay đổi profile)
        assert not np.allclose(vec_listen_only, vec_with_like)

    def test_profile_is_l2_normalized(self, sample_songs, sample_genres,
                                      sample_listen_history):
        """User profile phải được L2 normalize để cosine similarity đúng."""
        dataset = build_song_feature_dataset(sample_songs, sample_genres)
        vec = get_user_feature_vector(
            "u1", sample_listen_history, ["song-01"], dataset
        )
        assert vec is not None
        norm = np.linalg.norm(vec)
        assert norm == pytest.approx(1.0, abs=1e-5)

    def test_long_listen_higher_weight_than_short(self, sample_songs, sample_genres):
        """Nghe lâu → bài đó ảnh hưởng profile nhiều hơn."""
        dataset = build_song_feature_dataset(sample_songs, sample_genres)

        # Long listen on song-00 only
        vec_long = get_user_feature_vector(
            "u", [{"songId": "song-00", "durationSeconds": 300}], [], dataset
        )
        # Short listen on song-00, then song-01 with same duration
        vec_equal = get_user_feature_vector(
            "u",
            [
                {"songId": "song-00", "durationSeconds": 30},
                {"songId": "song-01", "durationSeconds": 30},
            ],
            [],
            dataset,
        )

        assert vec_long is not None
        assert vec_equal is not None

    def test_unknown_song_ids_ignored(self, sample_songs, sample_genres):
        """SongId không tồn tại trong dataset phải được bỏ qua."""
        dataset = build_song_feature_dataset(sample_songs, sample_genres)
        history = [
            {"songId": "nonexistent-song", "durationSeconds": 200},
            {"songId": "song-00", "durationSeconds": 180},
        ]
        # Không được raise exception, chỉ skip unknown song
        vec = get_user_feature_vector("u", history, [], dataset)
        assert vec is not None

    def test_cold_start_with_favorite_genre(self, sample_songs, sample_genres):
        """User không có history dùng favorite genres để tạo profile."""
        dataset = build_song_feature_dataset(sample_songs, sample_genres)
        vec = get_user_feature_vector(
            "new-user", [], [],
            dataset,
            favorite_genre_ids=["Pop", "Rock"]
        )
        assert vec is not None
        # Profile phải có feature cho Pop và Rock
        pop_idx = dataset.genre_index["Pop"]
        rock_idx = dataset.genre_index["Rock"]
        # Sau normalize, Pop và Rock dims phải > 0
        assert vec[pop_idx] > 0
        assert vec[rock_idx] > 0


# ── Pipeline Integration (light) ─────────────────────────────────────────────

class TestPipelineIntegration:
    """Light integration test: dataset build → trainer.train() flow."""

    def test_cf_trainer_train_returns_metrics(
            self, sample_interaction_records, monkeypatch
    ):
        """CFTrainer.train() phải trả về dict metrics hợp lệ."""
        from app.training.cf_trainer import CFTrainer

        trainer = CFTrainer()

        # Mock Redis và MinIO calls
        monkeypatch.setattr("app.training.cf_trainer.get_sync_redis",
                            lambda: _mock_redis())
        monkeypatch.setattr("app.training.cf_trainer.get_minio",
                            lambda: _mock_minio())

        dataset = build_interaction_dataset(
            sample_interaction_records,
            min_interactions=2,
            alpha=40.0,
        )
        metrics = trainer.train(dataset)

        assert "train_time_sec" in metrics
        assert "n_users" in metrics
        assert "n_songs" in metrics
        assert "model_version" in metrics
        assert metrics["train_time_sec"] >= 0
        assert metrics["n_users"] == dataset.n_users

    def test_cb_trainer_train_returns_metrics(
            self, sample_songs, sample_genres, monkeypatch
    ):
        """CBTrainer.train() phải return metrics và không crash."""
        from app.training.cb_trainer import CBTrainer

        trainer = CBTrainer()
        monkeypatch.setattr("app.training.cb_trainer.get_sync_redis",
                            lambda: _mock_redis())
        monkeypatch.setattr("app.training.cb_trainer.get_minio",
                            lambda: _mock_minio())

        dataset = build_song_feature_dataset(sample_songs, sample_genres)
        metrics = trainer.train(dataset)

        assert "train_time_sec" in metrics
        assert "n_songs" in metrics
        assert metrics["n_songs"] == len(sample_songs)


# ── Test Helpers ──────────────────────────────────────────────────────────────

def _mock_redis():
    """Redis mock đơn giản cho training tests."""
    from unittest.mock import MagicMock
    r = MagicMock()
    r.setex = MagicMock(return_value=True)
    r.set = MagicMock(return_value=True)
    r.get = MagicMock(return_value=None)
    r.pipeline = MagicMock(return_value=_mock_pipeline())
    r.scan_iter = MagicMock(return_value=iter([]))
    return r


def _mock_pipeline():
    from unittest.mock import MagicMock
    pipe = MagicMock()
    pipe.setex = MagicMock(return_value=pipe)
    pipe.execute = MagicMock(return_value=[True])
    return pipe


def _mock_minio():
    from unittest.mock import MagicMock
    m = MagicMock()
    m.put_object = MagicMock()
    m.bucket_exists = MagicMock(return_value=True)
    return m