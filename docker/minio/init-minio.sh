#!/bin/sh
set -eu

log() {
  echo "[minio-init] $*"
}

retry=0
until mc alias set local "$MINIO_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1; do
  retry=$((retry + 1))
  if [ "$retry" -ge 30 ]; then
    log "unable to connect to MinIO after $retry attempts"
    exit 1
  fi
  log "waiting for MinIO... ($retry/30)"
  sleep 2
done

ensure_bucket() {
  bucket="$1"
  log "ensuring bucket '$bucket' exists"
  mc mb --ignore-existing "local/$bucket"
}

set_public_policy() {
  bucket="$1"

  if mc anonymous set download "local/$bucket" >/dev/null 2>&1; then
    log "applied anonymous download policy to '$bucket'"
    return 0
  fi

  if mc anonymous set public "local/$bucket" >/dev/null 2>&1; then
    log "applied anonymous public policy to '$bucket'"
    return 0
  fi

  log "failed to apply anonymous policy to '$bucket'"
  return 1
}

ensure_bucket "$MINIO_RAW_BUCKET"
ensure_bucket "$MINIO_PUBLIC_BUCKET"
ensure_bucket "$MINIO_ADS_BUCKET"
ensure_bucket "$MINIO_AI_BUCKET"
ensure_bucket "$MINIO_ML_BUCKET"
set_public_policy "$MINIO_PUBLIC_BUCKET"

log "buckets are ready"
