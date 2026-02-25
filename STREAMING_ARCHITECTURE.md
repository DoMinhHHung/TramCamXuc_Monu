# Streaming Architecture (HLS-first)

## 1) Transcoder flow

1. `music-service` publish `song.transcode` message.
2. `transcoder-service` pulls raw file from MinIO (`raw-songs`).
3. Run FFmpeg to create HLS ladder (`master.m3u8`, `stream_%v.m3u8`, `.ts` chunks).
4. Upload output to MinIO public bucket path `hls/{songId}/`.
5. Publish `song.transcode.success` back to update media metadata.

## 2) Recommended FFmpeg params

- `-hls_time=6` (configurable)
- `-hls_playlist_type vod`
- `-hls_flags independent_segments`
- multi-bitrate audio ladder from env: `TRANSCODER_HLS_BITRATES`

Current env knobs in `transcoder`:
- `TRANSCODER_HLS_SEGMENT_DURATION_SECONDS`
- `TRANSCODER_HLS_BITRATES`
- `TRANSCODER_TIMEOUT_MINUTES`
- `TRANSCODER_GENERATE_MP3_DOWNLOAD` (default `false`)

## 3) Serving strategy for Mobile/Web

### Path A (recommended): CDN -> Nginx -> MinIO origin

- Client stream URL points to CDN domain.
- CDN caches `.m3u8`/`.ts` with:
  - short TTL for playlist (`master.m3u8`, variant m3u8)
  - long TTL for immutable segment files
- Nginx reverse proxy to MinIO origin with:
  - `Cache-Control` tuned by file type
  - Range request enabled
  - optional signed URL / tokenized query (anti hotlink)

### Path B: CDN directly from MinIO

- Use MinIO as origin, enforce bucket policy read-only for HLS prefix.
- Prefer presigned + short-lived URLs for private content.

## 4) Anti-rip hardening

- Do not expose permanent raw file URLs.
- Keep download MP3 disabled in production (`TRANSCODER_GENERATE_MP3_DOWNLOAD=false`).
- Use short-lived signed URLs at gateway/edge.
- Enable watermark / forensic tagging for premium catalogs if needed.
- Add per-IP and per-user rate limiting at gateway and CDN WAF.

## 5) Suggested Nginx edge snippet

```nginx
location /hls/ {
    proxy_pass http://minio:9000/music/;
    proxy_set_header Host $host;
    add_header Access-Control-Allow-Origin *;

    # Playlist files: short cache
    if ($request_uri ~* \.m3u8$) {
        add_header Cache-Control "public, max-age=10";
    }

    # Segments: longer cache
    if ($request_uri ~* \.ts$) {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```
