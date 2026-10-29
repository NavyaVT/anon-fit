"""Authenticated user profile routes (self-service)."""

from fastapi import APIRouter, HTTPException, status

from app.auth.dependencies import CurrentUser
from app.auth.security import hash_password, verify_password
from app.auth.sessions import issue_tokens, revoke_all_refresh_tokens
from app.database import users
from app.schemas.auth import ChangePasswordRequest, ChangePasswordResponse
from app.schemas.user import UserPublic
from app.utils.dates import utcnow
from app.utils.logging_store import log_event
from app.utils.serializers import user_public

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserPublic, summary="Get my profile")
async def get_me(current_user: CurrentUser) -> dict:
    return user_public(current_user)


@router.post(
    "/me/change-password",
    response_model=ChangePasswordResponse,
    summary="Change password and rotate the current session",
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUser,
) -> dict:
    if not verify_password(payload.current_password, current_user.get("passwordHash", "")):
        await log_event(
            level="warning",
            category="security",
            event="auth.password_change_failed",
            message="Password change rejected: current password incorrect",
            actor_anonymized_id=current_user["anonymizedId"],
        )
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Current password is incorrect",
        )

    if payload.current_password == payload.new_password:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "New password must be different from the current password",
        )

    now = utcnow()
    await users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "passwordHash": hash_password(payload.new_password),
                "updatedAt": now,
                # A password change invalidates every existing refresh token.
                # The current device receives a fresh pair below.
                "failedLoginAttempts": 0,
                "lockedUntil": None,
            }
        },
    )
    await revoke_all_refresh_tokens(current_user["_id"])

    current_user["passwordHash"] = "changed"
    current_user["updatedAt"] = now
    tokens = await issue_tokens(current_user)

    await log_event(
        level="info",
        category="auth",
        event="auth.password_changed",
        message="Password changed; all other sessions were revoked",
        actor_anonymized_id=current_user["anonymizedId"],
    )

    return {
        "message": "Password updated. All other sessions were signed out.",
        "user": user_public(current_user),
        **tokens,
    }
