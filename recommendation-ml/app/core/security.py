"""
app/core/security.py

Dependency dùng để bảo vệ các internal endpoints (training triggers).
Yêu cầu header X-Internal-Secret khớp với INTERNAL_SERVICE_SECRET env var.
"""
import hmac
from fastapi import Header, HTTPException, status
from app.core.settings import get_settings

_settings = get_settings()


async def verify_internal_secret(
    x_internal_secret: str = Header(..., alias="X-Internal-Secret"),
) -> None:
    """
    FastAPI dependency — inject vào route để chặn request không có đúng secret.
    Dùng hmac.compare_digest để tránh timing attack.
    """
    if not _settings.internal_service_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not configured for internal calls",
        )
    if not hmac.compare_digest(
        x_internal_secret.encode(),
        _settings.internal_service_secret.encode(),
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )
