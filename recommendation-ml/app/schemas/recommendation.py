from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ListenEvent(BaseModel):
    song_id: str
    artist_id: Optional[str] = None
    duration_seconds: int = 0
    listened_at: datetime


class GenreInfo(BaseModel):
    id: str
    name: str


class SongFeatures(BaseModel):
    song_id: str
    artist_id: Optional[str] = None
    genre_ids: List[str] = []
    play_count: int = 0
    duration_seconds: Optional[int] = None


class RecommendRequest(BaseModel):
    user_id: str
    listen_history: List[ListenEvent] = []
    followed_artist_ids: List[str] = []
    candidate_song_features: List[SongFeatures] = []
    limit: int = 20
    # Favorites for cold-start recommendation
    favorite_genre_ids: List[str] = []
    favorite_artist_ids: List[str] = []


class SimilarRequest(BaseModel):
    seed_song: SongFeatures
    candidates: List[SongFeatures] = []
    limit: int = 10


class ScoredSong(BaseModel):
    song_id: str
    score: float
    reason: str


class RecommendResponse(BaseModel):
    user_id: str
    songs: List[ScoredSong]
    strategy: str = "hybrid"
    compute_time_ms: float