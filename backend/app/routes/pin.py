"""4-digit app-lock PIN — an alternative to the biometric gate.

Members who cannot (or prefer not to) use a fingerprint can set a 4-digit
PIN that releases the privacy lock on a signed-in device. The PIN is
deliberately NOT a sign-in credential: it never grants a session by itself,
it only opens the in-app lock, which is why a short code stays safe here.

Privacy notes
-------------
* Only a bcrypt hash is stored — the digits are never persisted, logged or
  returned by any endpoint.
* Unlock attempts are rate-limited: five wrong codes block PIN unlocks for
  15 minutes on the account.
* Setting, changing, removing and every failed verification are written to
  the activity log under the member's anonymized id only.
"""

import logging
from datetime import timedelta

from fastapi import APIRouter, HTTPException, status

from app.auth.dependencies import CurrentUserOnly
from app.auth.security import hash_password, verify_password
from app.database import users
from app.schemas.user import PinActionResponse, PinRemoveRequest, PinSetRequest, PinVerifyRequest
from app.utils.dates import utcnow
from app.utils.logging_store import log_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users/me/pin", tags=["App-lock PIN"])

#: Wrong PINs allowed before PIN unlocks are temporarily blocked.
MAX_PIN_ATTEMPTS = 5
#: How long PIN unlocks stay blocked after exceeding the limit.
PIN_LOCKOUT_MINUTES = 15


def _pin_locked_error(user: dict) -> HTTPException | None:
    """Return the lockout exception while the PIN is blocked, else None."""
    locked_until = user.get("pinLockedUntil")
    if not locked_until or locked_until <= utcnow():
        return None
    minutes = max(1, int((locked_until - utcnow()).total_seconds() // 60) + 1)
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        f"Too many wrong PINs. PIN unlock is blocked for another {minutes} minute(s). "
        "You can still use your password.",
    )


async def _verify_stepup(user: dict, current_pin: str | None, current_password: str | None) -> None:
    """Authorize a PIN change/removal: the current PIN or the password."""
    if current_pin and user.get("pinHash") and verify_password(current_pin, user["pinHash"]):
        return
    if current_password and verify_password(current_password, user.get("passwordHash", "")):
        return
    await log_event(
        level="warning",
        category="security",
        event="auth.pin_change_failed",
        message="PIN change rejected: current PIN or password incorrect",
        actor_anonymized_id=user["anonymizedId"],
    )
    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        "Your current PIN or password is incorrect.",
    )


@router.post("", response_model=PinActionResponse, summary="Set or change my 4-digit PIN")
async def set_pin(
    payload: PinSetRequest,
    current_user: CurrentUserOnly,
) -> dict:
    locked = _pin_locked_error(current_user)
    if locked:
        raise locked

    replacing = bool(current_user.get("pinHash"))
    # First set-up proves knowledge of the password; later changes may use
    # either the existing PIN or the password, so a forgotten PIN is never a trap.
    if replacing:
        await _verify_stepup(current_user, payload.current_pin, payload.current_password)
    else:
        if not payload.current_password or not verify_password(
            payload.current_password, current_user.get("passwordHash", "")
        ):
            await log_event(
                level="warning",
                category="security",
                event="auth.pin_change_failed",
                message="PIN set-up rejected: password incorrect",
                actor_anonymized_id=current_user["anonymizedId"],
            )
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your password is incorrect.")

    now = utcnow()
    await users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "pinHash": hash_password(payload.pin),
                "pinFailedAttempts": 0,
                "pinLockedUntil": None,
                "updatedAt": now,
            }
        },
    )
    await log_event(
        level="info",
        category="auth",
        event="auth.pin_changed" if replacing else "auth.pin_set",
        message=(
            "App-lock PIN changed"
            if replacing
            else "App-lock PIN enabled as a fingerprint alternative"
        ),
        actor_anonymized_id=current_user["anonymizedId"],
    )
    return {
        "message": (
            "PIN updated. You can unlock AnonFit with it or with your fingerprint."
            if replacing
            else "PIN saved. You can now unlock AnonFit with it or with your fingerprint."
        ),
        "pin_enabled": True,
    }


@router.post("/unlock", summary="Unlock the privacy lock with my PIN")
async def unlock_with_pin(
    payload: PinVerifyRequest,
    current_user: CurrentUserOnly,
) -> dict:
    locked = _pin_locked_error(current_user)
    if locked:
        raise locked

    if not current_user.get("pinHash") or not verify_password(
        payload.pin, current_user["pinHash"]
    ):
        attempts = int(current_user.get("pinFailedAttempts", 0)) + 1
        update: dict = {"pinFailedAttempts": attempts}
        if attempts >= MAX_PIN_ATTEMPTS:
            update["pinLockedUntil"] = utcnow() + timedelta(minutes=PIN_LOCKOUT_MINUTES)
        await users.update_one({"_id": current_user["_id"]}, {"$set": update})

        if attempts >= MAX_PIN_ATTEMPTS:
            await log_event(
                level="warning",
                category="security",
                event="auth.pin_locked",
                message=f"PIN unlock blocked for {PIN_LOCKOUT_MINUTES} minutes after "
                f"{MAX_PIN_ATTEMPTS} wrong PINs",
                actor_anonymized_id=current_user["anonymizedId"],
            )
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"Too many wrong PINs. PIN unlock is blocked for {PIN_LOCKOUT_MINUTES} "
                "minutes. You can still use your password.",
            )

        await log_event(
            level="warning",
            category="security",
            event="auth.pin_failed",
            message=f"Wrong PIN at the privacy lock ({attempts}/{MAX_PIN_ATTEMPTS})",
            actor_anonymized_id=current_user["anonymizedId"],
        )
        remaining = MAX_PIN_ATTEMPTS - attempts
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            f"Wrong PIN. {remaining} attempt(s) left before PIN unlock is temporarily blocked.",
        )

    await users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"pinFailedAttempts": 0, "pinLockedUntil": None}},
    )
    await log_event(
        level="debug",
        category="auth",
        event="auth.pin_unlocked",
        message="Privacy lock released with the PIN",
        actor_anonymized_id=current_user["anonymizedId"],
    )
    return {"verified": True, "anonymized_id": current_user["anonymizedId"]}


@router.delete("", response_model=PinActionResponse, summary="Remove my 4-digit PIN")
async def remove_pin(
    payload: PinRemoveRequest,
    current_user: CurrentUserOnly,
) -> dict:
    locked = _pin_locked_error(current_user)
    if locked:
        raise locked

    if not current_user.get("pinHash"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You don't have a PIN set up yet.")

    await _verify_stepup(current_user, payload.current_pin, payload.current_password)

    await users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "pinHash": None,
                "pinFailedAttempts": 0,
                "pinLockedUntil": None,
                "updatedAt": utcnow(),
            }
        },
    )
    await log_event(
        level="info",
        category="auth",
        event="auth.pin_removed",
        message="App-lock PIN removed",
        actor_anonymized_id=current_user["anonymizedId"],
    )
    return {
        "message": "PIN removed. Your fingerprint sign-in is unaffected.",
        "pin_enabled": False,
    }
