"""Session helpers shared by auth and profile routes."""

from app.auth.jwt import create_access_token, create_refresh_token
from app.database import refresh_tokens
from app.utils.dates import utcnow


async def store_refresh_token(user_id, jti: str, expires_at, replaced_by: str | None = None) -> None:
    await refresh_tokens.insert_one(
        {
            "userId": user_id,
            "jti": jti,
            "expiresAt": expires_at,
            "revoked": False,
            "replacedBy": replaced_by,
            "createdAt": utcnow(),
        }
    )


async def issue_tokens(user: dict) -> dict:
    """Create an access/refresh pair and persist the refresh token."""
    access_token, expires_in = create_access_token(user)
    refresh_token, jti, expires_at = create_refresh_token(user)
    await store_refresh_token(user["_id"], jti, expires_at)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": expires_in,
    }


async def revoke_all_refresh_tokens(user_id) -> None:
    await refresh_tokens.update_many(
        {"userId": user_id, "revoked": False},
        {"$set": {"revoked": True, "revokedAt": utcnow(), "revokedReason": "all_sessions"}},
    )


async def revoke_refresh_token(jti: str, reason: str = "logout") -> None:
    await refresh_tokens.update_one(
        {"jti": jti, "revoked": False},
        {"$set": {"revoked": True, "revokedAt": utcnow(), "revokedReason": reason}},
    )
