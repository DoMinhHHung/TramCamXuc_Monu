#!/bin/sh
set -eu

retry=0
until mc alias set local "$MINIO_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1; do
  retry=$((retry + 1))
  if [ "$retry" -ge 30 ]; then
    echo "[minio-init] unable to connect to MinIO after $retry attempts" >&2
    exit 1
  fi
  echo "[minio-init] waiting for MinIO... ($retry/30)"
  sleep 2
done

ensure_bucket() {
  bucket="$1"
  echo "[minio-init] ensuring bucket '$bucket' exists"
  mc mb --ignore-existing "local/$bucket"
}

ensure_bucket "$MINIO_RAW_BUCKET"
ensure_bucket "$MINIO_PUBLIC_BUCKET"
ensure_bucket "$MINIO_ADS_BUCKET"
ensure_bucket "$MINIO_AI_BUCKET"
ensure_bucket "$MINIO_ML_BUCKET"

mc anonymous set download "local/$MINIO_PUBLIC_BUCKET"

echo "[minio-init] buckets are ready"
