# Analytics & Trending Data Pipeline

## 1) Event-driven model

Không query trực tiếp Mongo `ListenHistory` để tính realtime trending nữa.

### Producer
- `music-service` phát `SongListenEvent` vào RabbitMQ topic exchange (`music.event.exchange`).

### Consumers
- `social-service` worker: lưu raw `ListenHistory` (audit/user timeline).
- `music-service` worker: cập nhật counters/score phục vụ realtime trending.
- (new) analytics worker: ghi time-series warehouse để batch AI recommendation.

## 2) Storage layers

- **Hot path (realtime)**: Redis Sorted Set / Postgres aggregate table theo cửa sổ 5m/1h/24h.
- **Warm path (operational)**: Mongo `ListenHistory` để trace và debug user behavior.
- **Cold path (analytics)**: time-series table (TimescaleDB/ClickHouse/BigQuery) partition theo time.

## 3) Recommended schema (time-series)

`song_listen_timeseries`
- `event_time` (timestamp, partition key)
- `song_id` (uuid)
- `artist_id` (uuid)
- `user_id` (uuid nullable)
- `duration_seconds` (int)
- `source` (mobile/web)
- `region` (varchar)

Indexes:
- `(event_time DESC, song_id)`
- `(song_id, event_time DESC)`

## 4) Trending score

- Score window = weighted sum of listens in 15m / 1h / 24h.
- decay function for freshness.
- bot filtering before scoring (duplicate IP/user/time burst).

## 5) AI recommendation pipeline

- Batch job reads time-series table daily/hourly.
- Generate embeddings / collaborative features.
- Publish recommendation artifacts to Redis/DB for serving layer.
