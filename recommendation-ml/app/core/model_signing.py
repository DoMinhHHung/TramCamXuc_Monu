"""
app/core/model_signing.py

HMAC-SHA256 signing cho model artifacts trước khi lưu vào MinIO.
Bảo vệ chống model tampering nếu MinIO bị compromise.
"""
import hashlib
import hmac
import io

from app.core.clients import get_minio
from app.core.logging import get_logger
from app.core.settings import get_settings

log = get_logger(__name__)


def compute_hmac(data: bytes, secret: str) -> str:
    """Tính HMAC-SHA256 hex digest của data."""
    return hmac.new(
        secret.encode("utf-8"),
        data,
        hashlib.sha256,
    ).hexdigest()


def upload_with_signature(
    bucket: str,
    object_name: str,
    data: bytes,
    content_type: str = "application/octet-stream",
) -> None:
    """
    Upload model bytes lên MinIO kèm file .sig chứa HMAC-SHA256.
    Nếu MODEL_SIGNING_SECRET chưa set, upload bình thường và log warning.
    """
    settings = get_settings()
    minio = get_minio()

    # Upload model file
    minio.put_object(
        bucket_name=bucket,
        object_name=object_name,
        data=io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )

    if not settings.model_signing_secret:
        log.warning("model_signing_secret_not_set_skip_sig", object=object_name)
        return

    # Tính HMAC và upload file .sig
    sig = compute_hmac(data, settings.model_signing_secret)
    sig_bytes = sig.encode("utf-8")
    sig_object = object_name + ".sig"

    minio.put_object(
        bucket_name=bucket,
        object_name=sig_object,
        data=io.BytesIO(sig_bytes),
        length=len(sig_bytes),
        content_type="text/plain",
    )
    log.info("model_sig_uploaded", object=sig_object)


def verify_signature(bucket: str, object_name: str, data: bytes) -> None:
    """
    Download file .sig từ MinIO và verify HMAC của data.
    Raise ValueError nếu signature không khớp hoặc không tồn tại.
    Nếu MODEL_SIGNING_SECRET chưa set, bỏ qua verify và log warning.
    """
    settings = get_settings()

    if not settings.model_signing_secret:
        log.warning("model_signing_secret_not_set_skip_verify", object=object_name)
        return

    minio = get_minio()
    sig_object = object_name + ".sig"

    try:
        response = minio.get_object(bucket_name=bucket, object_name=sig_object)
        stored_sig = response.read().decode("utf-8").strip()
    except Exception as e:
        raise ValueError(
            f"Cannot load model signature for {object_name}: {e}"
        ) from e

    expected_sig = compute_hmac(data, settings.model_signing_secret)
    if not hmac.compare_digest(expected_sig, stored_sig):
        raise ValueError(
            f"Model signature verification FAILED for {object_name} — possible tampering!"
        )

    log.info("model_sig_verified_ok", object=object_name)
