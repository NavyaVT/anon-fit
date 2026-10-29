"""Authentication & session lifecycle routes.

Covers: registration, user login, separate admin login, refresh-token rotation,
logout, and logout from all devices.

Brute-force policy
------------------
Three consecutive wrong passwords lock the account for 15 minutes. The first two
failures return the generic ``401`` used for unknown emails (no account
enumeration); the third returns ``429`` with the lock window, and every attempt
made while locked is rejected without touching the password hash.

All lifecycle events are written to the dual sink in
:mod:`app.utils.logging_store` (rotating file + ``system_logs`` table).
"""

import logging
from datetime import timedelta

from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.auth.dependencies import CurrentUser
from app.auth.jwt import TokenError, create_access_token, create_refresh_token, decode_token
from app.auth.security import hash_password, verify_dummy_password, verify_password
from app.auth.sessions import (
    issue_tokens,
    revoke_all_refresh_tokens,
    revoke_refresh_token,
    store_refresh_token,
)
from app.config import get_settings
from app.database import refresh_tokens, users
from app.models.user import AccountStatus, UserRole
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
)
from app.schemas.user import Message
from app.utils.audit import record_audit
from app.utils.dates import utcnow
from app.utils.ids import generate_anonymized_id
from app.utils.logging_store import fingerprint, log_event
from app.utils.serializers import user_public

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

#: Wrong passwords allowed before the account is temporarily blocked.
MAX_FAILED_ATTEMPTS = 3
#: How long the account stays blocked after exceeding the limit.
LOCKOUT_MINUTES = 15

GENERIC_CREDENTIALS_ERROR = "Invalid email or password"


def _lockout_headers(minutes: int) -> dict[str, str]:
    return {
        "WWW-Authenticate": "Bearer",
        "Retry-After": str(minutes * 60),
        "X-AnonFit-Lockout": "true",
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _authenticate(
    email: str,
    password: str,
    required_role: UserRole | None = None,
) -> dict:
    """Validate credentials and account state, with brute-force protection.

    * Same generic error for unknown emails and wrong passwords.
    * Requires ``active`` status (suspended users cannot log in).
    * 3 failed attempts block the account for 15 minutes.
    """
    normalized_email = email.strip().lower()
    user = await users.find_one({"email": normalized_email})

    if user is None:
        verify_dummy_password(password)
        await log_event(
            level="warning",
            category="security",
            event="auth.login_failed",
            message="Sign-in attempt for an unknown email",
            identifier_fingerprint=fingerprint(normalized_email),
            metadata={"reason": "unknown_email"},
        )
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, GENERIC_CREDENTIALS_ERROR)

    anon_id = user["anonymizedId"]
    now = utcnow()

    locked_until = user.get("lockedUntil")
    if locked_until and locked_until > now:
        minutes = max(1, int((locked_until - now).total_seconds() // 60) + 1)
        await log_event(
            level="warning",
            category="security",
            event="auth.login_blocked",
            message="Sign-in rejected while the account was blocked",
            actor_anonymized_id=anon_id,
            metadata={"remainingMinutes": minutes},
        )
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Too many failed attempts. This account is blocked for another "
            f"{minutes} minute(s).",
            headers=_lockout_headers(minutes),
        )

    if not verify_password(password, user.get("passwordHash", "")):
        attempts = int(user.get("failedLoginAttempts", 0)) + 1
        remaining = max(0, MAX_FAILED_ATTEMPTS - attempts)

        if attempts >= MAX_FAILED_ATTEMPTS:
            # Threshold reached → block the account and reset the counter so the
            # user gets a clean set of attempts once the lock expires.
            await users.update_one(
                {"_id": user["_id"]},
                {
                    "$set": {
                        "failedLoginAttempts": 0,
                        "lockedUntil": now + timedelta(minutes=LOCKOUT_MINUTES),
                        "lastFailedLoginAt": now,
                        "updatedAt": now,
                    }
                },
            )
            await log_event(
                level="warning",
                category="security",
                event="auth.account_locked",
                message=(
                    f"Account blocked for {LOCKOUT_MINUTES} minutes after "
                    f"{MAX_FAILED_ATTEMPTS} failed sign-in attempts"
                ),
                actor_anonymized_id=anon_id,
                metadata={
                    "failedAttempts": MAX_FAILED_ATTEMPTS,
                    "lockoutMinutes": LOCKOUT_MINUTES,
                },
            )
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"Too many failed attempts. This account is blocked for "
                f"{LOCKOUT_MINUTES} minutes.",
                headers=_lockout_headers(LOCKOUT_MINUTES),
            )

        await users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "failedLoginAttempts": attempts,
                    "lastFailedLoginAt": now,
                    "updatedAt": now,
                }
            },
        )
        await log_event(
            level="warning",
            category="security",
            event="auth.login_failed",
            message=(
                f"Wrong password ({attempts}/{MAX_FAILED_ATTEMPTS} attempts used)"
            ),
            actor_anonymized_id=anon_id,
            metadata={"attempt": attempts, "maxAttempts": MAX_FAILED_ATTEMPTS},
        )
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, GENERIC_CREDENTIALS_ERROR)

    account_status = user.get("status", AccountStatus.ACTIVE)
    if account_status == AccountStatus.SUSPENDED:
        await log_event(
            level="warning",
            category="security",
            event="auth.login_denied",
            message="Sign-in refused for a suspended account",
            actor_anonymized_id=anon_id,
            metadata={"status": account_status},
        )
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "This account has been suspended. Please contact an administrator.",
        )
    if account_status == AccountStatus.DELETED:
        await log_event(
            level="warning",
            category="security",
            event="auth.login_denied",
            message="Sign-in refused for a soft-deleted account",
            actor_anonymized_id=anon_id,
            metadata={"status": account_status},
        )
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, GENERIC_CREDENTIALS_ERROR)

    if required_role and user.get("role") != required_role:
        await log_event(
            level="warning",
            category="security",
            event="auth.privilege_denied",
            message="Valid credentials used against the wrong sign-in endpoint",
            actor_anonymized_id=anon_id,
            metadata={
                "requiredRole": required_role.value,
                "actualRole": user.get("role"),
            },
        )
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "This account does not have administrator access.",
        )

    await users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "failedLoginAttempts": 0,
                "lockedUntil": None,
                "lastLoginAt": now,
                "updatedAt": now,
            }
        },
    )
    user.update(
        {
            "failedLoginAttempts": 0,
            "lockedUntil": None,
            "lastLoginAt": now,
            "updatedAt": now,
        }
    )
    return user


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user account and sign in",
)
async def register(payload: RegisterRequest) -> dict:
    email = str(payload.email).strip().lower()

    if await users.find_one({"email": email}):
        await log_event(
            level="warning",
            category="security",
            event="auth.register_rejected",
            message="Registration rejected: email already in use",
            identifier_fingerprint=fingerprint(email),
            metadata={"reason": "duplicate_email"},
        )
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "An account with this email already exists.",
        )

    # Generate a collision-free permanent anonymized id.
    anonymized_id = ""
    for _ in range(5):
        candidate = generate_anonymized_id()
        if not await users.find_one({"anonymizedId": candidate}):
            anonymized_id = candidate
            break
    if not anonymized_id:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not create account")

    now = utcnow()
    user_doc = {
        "email": email,
        "passwordHash": hash_password(payload.password),
        "role": UserRole.USER.value,
        "status": AccountStatus.ACTIVE.value,
        "anonymizedId": anonymized_id,
        "biometricEnabled": False,
        "failedLoginAttempts": 0,
        "lockedUntil": None,
        "createdAt": now,
        "updatedAt": now,
        "lastLoginAt": now,
        "deletedAt": None,
    }

    try:
        result = await users.insert_one(user_doc)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "An account with this email already exists.",
        ) from exc

    user_doc["_id"] = result.inserted_id
    tokens = await issue_tokens(user_doc)

    await log_event(
        level="info",
        category="auth",
        event="auth.registered",
        message="New member account created",
        actor_anonymized_id=anonymized_id,
    )
    return {**tokens, "user": user_public(user_doc)}


@router.post("/login", response_model=AuthResponse, summary="User login")
async def login(payload: LoginRequest) -> dict:
    user = await _authenticate(str(payload.email), payload.password, required_role=UserRole.USER)
    tokens = await issue_tokens(user)

    await log_event(
        level="info",
        category="auth",
        event="auth.login",
        message="Member signed in",
        actor_anonymized_id=user["anonymizedId"],
    )
    return {**tokens, "user": user_public(user)}


@router.post("/admin/login", response_model=AuthResponse, summary="Administrator login")
async def admin_login(payload: LoginRequest) -> dict:
    user = await _authenticate(str(payload.email), payload.password, required_role=UserRole.ADMIN)
    tokens = await issue_tokens(user)

    await record_audit(
        actor_anonymized_id=user["anonymizedId"],
        action="admin.login",
    )
    await log_event(
        level="info",
        category="admin",
        event="auth.admin_login",
        message="Administrator signed in",
        actor_anonymized_id=user["anonymizedId"],
    )
    logger.info("Admin login: %s", user["anonymizedId"])
    return {**tokens, "user": user_public(user)}


@router.post("/refresh", response_model=AuthResponse, summary="Rotate refresh token")
async def refresh_session(payload: RefreshRequest) -> dict:
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
    except TokenError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    jti = claims["jti"]
    stored = await refresh_tokens.find_one({"jti": jti})
    if stored is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token is no longer valid")

    if stored.get("revoked"):
        # Reuse of a rotated token: assume compromise and kill the whole family.
        await revoke_all_refresh_tokens(stored["userId"])
        await log_event(
            level="error",
            category="security",
            event="auth.refresh_reuse",
            message="Revoked refresh token was replayed — all sessions revoked",
            metadata={"jti": jti},
        )
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Refresh token was already used. Please sign in again.",
        )

    if stored["expiresAt"] <= utcnow():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")

    user = await users.find_one({"_id": stored["userId"]})
    if user is None or user.get("status") != AccountStatus.ACTIVE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is not active")

    # Rotate: issue a new pair, atomically revoke the old token.
    access_token, expires_in = create_access_token(user)
    new_refresh, new_jti, new_expires = create_refresh_token(user)

    result = await refresh_tokens.update_one(
        {"_id": stored["_id"], "revoked": False},
        {
            "$set": {
                "revoked": True,
                "revokedAt": utcnow(),
                "replacedBy": new_jti,
                "revokedReason": "rotated",
            }
        },
    )
    if result.modified_count == 0:
        await revoke_all_refresh_tokens(user["_id"])
        await log_event(
            level="error",
            category="security",
            event="auth.refresh_reuse",
            message="Concurrent refresh detected — all sessions revoked",
            actor_anonymized_id=user.get("anonymizedId"),
        )
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Refresh token was already used. Please sign in again.",
        )

    await store_refresh_token(user["_id"], new_jti, new_expires, replaced_by=None)

    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "expires_in": expires_in,
        "user": user_public(user),
    }


@router.post("/logout", response_model=Message, summary="Revoke a refresh token")
async def logout(payload: LogoutRequest) -> Message:
    """Idempotent logout: revoke the supplied refresh token if it is valid."""
    if payload.refresh_token:
        try:
            claims = decode_token(payload.refresh_token, expected_type="refresh")
        except TokenError:
            claims = None
        if claims:
            await revoke_refresh_token(claims["jti"], reason="logout")
            await log_event(
                level="info",
                category="auth",
                event="auth.logout",
                message="Session signed out",
                actor_anonymized_id=claims.get("anon"),
            )
    return Message(message="Signed out successfully")


@router.post("/logout-all", response_model=Message, summary="Sign out every device")
async def logout_all(current_user: CurrentUser) -> Message:
    await revoke_all_refresh_tokens(current_user["_id"])
    await log_event(
        level="info",
        category="auth",
        event="auth.logout_all",
        message="All sessions revoked by the account owner",
        actor_anonymized_id=current_user["anonymizedId"],
    )
    return Message(message="Signed out of all devices")
