# transcode-service

## Introduction
`transcode-service` is an asynchronous worker service that converts uploaded raw audio into streaming-ready HLS outputs and downloadable 320kbps MP3 files.

## Tech Stack
- Spring Boot 3
- Spring AMQP (RabbitMQ)
- MinIO SDK
- ffmpeg + ffprobe (media processing)
- Spring Actuator (health/info)
- Eureka Client

## Core Logic
1. Consume `TranscodeSongMessage` from `transcode.queue` (manual ack mode configured).
2. Download source file from MinIO raw bucket.
3. Detect duration via `ffprobe`.
4. Generate multi-bitrate HLS playlists via `ffmpeg`.
5. Upload HLS directory to MinIO public bucket (`hls/{songId}` prefix).
6. Generate premium download MP3 (`320k`) and upload to raw bucket (`download/{songId}/...`).
7. Publish success callback to `music.exchange` with routing key `song.transcode.success`.
8. ACK on success, NACK with `requeue=false` on failure (message goes DLQ).

## API Documentation (Swagger & Postman)

### Direct service URL
- No business REST API is exposed in the current module.
- Operational endpoint: `http://localhost:8085/actuator/health`

### Gateway URL
- Not routed for public API usage in `api-gateway` at this time.

### JWT Bearer Token
- Not applicable for worker flow (RabbitMQ-driven service).

## Testing Guide (Postman)

### A. Health check
- Method: `GET`
- URL: `http://localhost:8085/actuator/health`

### B. End-to-end transcode test (recommended path)
1. Call music-service upload/confirm API.
2. Verify a message appears in `transcode.queue`.
3. After processing, verify callback in `transcode.success.queue` and updated song playback URL in music-service.

### C. RabbitMQ payload reference
If publishing manually (for integration testing), message shape should include:

```json
{
  "songId": "8bdf4f8b-7465-45dc-bcc8-86b355fef999",
  "rawFileKey": "raw/jamendo/12345.mp3",
  "fileExtension": "mp3"
}
```
