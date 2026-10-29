"""JWT creation / verification.

Access tokens are short lived. Refresh tokens are longer lived, carry a unique
``jti`` and are persisted so they can be rotated and revoked server-side.
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import get_settings
from app.models.user import UserDocument
from app.utils.ids import generate_jti

settings = get_settings()

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


class TokenError(Exception):
    """Raised when a token is missing, malformed, expired or of the wrong type."""


def _encode(subject: str, role: str, anon: str, token_type: str, expires_delta: timedelta,
            jti: str | None = None) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    expires_at = now + expires_delta
    payload: dict = {
        "sub": subject,
        "role": role,
        "anon": anon,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    if jti:
        payload["jti"] = jti

    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    # Naive UTC for Mongo persistence.
    return token, expires_at.replace(tzinfo=None)


def create_access_token(user: UserDocument | dict) -> tuple[str, int]:
    """Return (token, expires_in_seconds)."""
    doc = user if isinstance(user, dict) else user.model_dump(by_alias=True)
    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    token, _ = _encode(
        subject=str(doc["_id"]),
        role=doc.get("role", "user"),
        anon=doc["anonymizedId"],
        token_type=ACCESS_TOKEN_TYPE,
        expires_delta=expires_delta,
    )
    return token, int(expires_delta.total_seconds())


def create_refresh_token(user: UserDocument | dict) -> tuple[str, str, datetime]:
    """Return (token, jti, expires_at). The caller must persist the jti."""
    doc = user if isinstance(user, dict) else user.model_dump(by_alias=True)
    jti = generate_jti()
    expires_delta = timedelta(days=settings.refresh_token_expire_days)
    token, expires_at = _encode(
        subject=str(doc["_id"]),
        role=doc.get("role", "user"),
        anon=doc["anonymizedId"],
        token_type=REFRESH_TOKEN_TYPE,
        expires_delta=expires_delta,
        jti=jti,
    )
    return token, jti, expires_at


def decode_token(token: str, expected_type: str) -> dict:
    """Decode and validate a JWT, enforcing its token type."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        # python-jose lumps expiry into JWTError; inspect the message for a
        # clearer client-facing response.
        if "expired" in str(exc).lower():
            raise TokenError("Session expired") from exc
        raise TokenError("Invalid authentication token") from exc

    if payload.get("type") != expected_type:
        raise TokenError("Invalid token type")
    if not payload.get("sub"):
        raise TokenError("Malformed authentication token")
    if expected_type == REFRESH_TOKEN_TYPE and not payload.get("jti"):
        raise TokenError("Malformed refresh token")

    return payload
