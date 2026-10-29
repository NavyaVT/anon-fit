"""WebAuthn (passkey) ceremonies — fingerprint / face sign-in.

Members can enroll a platform authenticator (Touch ID, Face ID, Android
fingerprint, Windows Hello) and afterwards sign in without a password, or unlock
the app gate. The private key never leaves the device: the server stores only the
public key and a signature counter, and verifies a fresh signature for every
ceremony.

Privacy notes
-------------
* The credential's ``user.name`` is the anonymized id, never the email, so the
  OS passkey picker does not become a second identity store.
* Challenges are random, single-use and expire after five minutes.
* Origins are allow-listed; in development the local dev-tunnel hostnames are
  accepted too, because their subdomain changes on every session.
"""

import json
import logging
from datetime import timedelta
from urllib.parse import urlparse

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, status
from pymongo.errors import DuplicateKeyError
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
from webauthn.helpers.exceptions import WebAuthnException
from webauthn.helpers.structs import (
    AuthenticatorAttachment,
    AuthenticatorSelectionCriteria,
    AuthenticatorTransport,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from app.auth.dependencies import CurrentUserOnly
from app.auth.sessions import issue_tokens
from app.config import get_settings
from app.database import users, webauthn_challenges, webauthn_credentials
from app.models.user import AccountStatus
from app.schemas.auth import AuthResponse
from app.schemas.webauthn import (
    PasskeyInfo,
    PasskeyList,
    PasskeyLoginFinish,
    PasskeyRegisterFinish,
    PasskeyUnlockFinish,
    PasskeyVerify,
)
from app.utils.dates import as_utc, utcnow
from app.utils.logging_store import log_event
from app.utils.serializers import user_public

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/webauthn", tags=["WebAuthn"])
settings = get_settings()

#: A challenge is valid for one ceremony and for this long.
CHALLENGE_TTL_MINUTES = 5

#: Accepted in development only. Their hostnames change between sessions.
DEV_ORIGIN_SUFFIXES = (".devtunnels.ms", ".app.github.dev", ".github.dev")

VALID_TRANSPORTS = {item.value for item in AuthenticatorTransport}

EXPIRED_MESSAGE = "This sign-in attempt expired. Please try again."


# ---------------------------------------------------------------------------
# Request context
# ---------------------------------------------------------------------------
def _host(origin: str) -> str:
    return (urlparse(origin).hostname or "").lower()


def _is_allowed_origin(origin: str) -> bool:
    if origin in settings.webauthn_origin_list:
        return True
    
    # In development, also accept standard dev tunnel/tunneling service hosts.
    if not settings.is_production:
        host = _host(origin)
        if host in {"localhost", "127.0.0.1"}:
            return True
        return any(host.endswith(suffix) for suffix in DEV_ORIGIN_SUFFIXES)

    # In production, require an explicit allowlist entry.
    return False

def _ceremony_context(request: Request) -> tuple[str, str]:
    """Resolve ``(rp_id, origin)`` for this ceremony, rejecting foreign origins."""
    # Try to get the browser-reported origin (sent via CORS/proxy headers).
    raw_origin = (request.headers.get("origin") or request.headers.get("referer") or "").rstrip("/")

    if raw_origin:
        # Check against our flexible dev/prod rules
        if not _is_allowed_origin(raw_origin):
            logger.warning("Blocked passkey request from origin: %s", raw_origin)
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "This origin is not allowed to use passkeys. Ensure you are using HTTPS and the correct tunnel URL.",
            )
        origin = raw_origin
    else:
        # Fallback for non-browser clients (tests).
        if not settings.webauthn_origin_list:
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "No WebAuthn origin is configured.",
            )
        origin = settings.webauthn_origin_list[0]

    # RP ID must be the domain of the origin.
    # Note: If RP ID is left blank in config, we derive it from the origin.
    host = _host(origin)
    rp_id = settings.webauthn_rp_id or host
    
    if not rp_id:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "WebAuthn RP ID could not be resolved.",
        )
    return rp_id, origin


# ---------------------------------------------------------------------------
# Challenge store
# ---------------------------------------------------------------------------
async def _store_challenge(challenge: bytes, kind: str, user_id: ObjectId | None) -> None:
    now = utcnow()
    await webauthn_challenges.insert_one(
        {
            "challenge": bytes_to_base64url(challenge),
            "kind": kind,
            "userId": user_id,
            "createdAt": now,
            "expiresAt": now + timedelta(minutes=CHALLENGE_TTL_MINUTES),
        }
    )


def _challenge_from_credential(credential: dict) -> str:
    """Read the challenge the browser signed, straight from ``clientDataJSON``."""
    try:
        raw = base64url_to_bytes(credential["response"]["clientDataJSON"])
        payload = json.loads(raw)
        challenge = payload["challenge"]
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Malformed credential response")
    if not isinstance(challenge, str) or not challenge:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Malformed credential response")
    return challenge


async def _consume_challenge(
    credential: dict,
    kind: str,
    user_id: ObjectId | None = None,
) -> bytes:
    """Look up and delete the single-use challenge this response answers."""
    challenge = _challenge_from_credential(credential)
    query: dict = {"challenge": challenge, "kind": kind}
    if user_id is not None:
        query["userId"] = user_id

    stored = await webauthn_challenges.find_one(query)
    if stored is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, EXPIRED_MESSAGE)

    await webauthn_challenges.delete_one({"_id": stored["_id"]})
    if stored["expiresAt"] <= utcnow():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, EXPIRED_MESSAGE)
    return base64url_to_bytes(challenge)


def _presented_credential_id(credential: dict) -> str:
    """The credential ID as sent by the browser (base64url)."""
    raw_id = credential.get("id") or credential.get("rawId")
    if not isinstance(raw_id, str) or not raw_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Malformed credential response")
    try:
        return bytes_to_base64url(base64url_to_bytes(raw_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Malformed credential response")


def _descriptors(docs: list[dict]) -> list[PublicKeyCredentialDescriptor]:
    descriptors = []
    for doc in docs:
        transports = [t for t in doc.get("transports", []) if t in VALID_TRANSPORTS]
        descriptors.append(
            PublicKeyCredentialDescriptor(
                id=base64url_to_bytes(doc["credentialId"]),
                transports=[AuthenticatorTransport(t) for t in transports],
            )
        )
    return descriptors


def _passkey_info(doc: dict) -> dict:
    return {
        "id": doc["credentialId"],
        "label": doc.get("label") or "This device",
        "device_type": doc.get("deviceType"),
        "backed_up": bool(doc.get("backedUp")),
        "created_at": as_utc(doc.get("createdAt")),
        "last_used_at": as_utc(doc.get("lastUsedAt")),
    }


async def _list_for_user(user_id: ObjectId) -> dict:
    docs = (
        await webauthn_credentials.find({"userId": user_id})
        .sort("createdAt", -1)
        .to_list(20)
    )
    return {"enabled": bool(docs), "items": [_passkey_info(doc) for doc in docs]}


# ---------------------------------------------------------------------------
# Enrollment (authenticated)
# ---------------------------------------------------------------------------
@router.post("/register/begin", summary="Start passkey enrollment")
async def begin_registration(request: Request, current_user: CurrentUserOnly) -> dict:
    rp_id, _ = _ceremony_context(request)

    existing = await webauthn_credentials.find({"userId": current_user["_id"]}).to_list(20)
    options = generate_registration_options(
        rp_id=rp_id,
        rp_name=settings.webauthn_rp_name,
        # Anonymized id only — never the email address.
        user_id=current_user["anonymizedId"].encode("utf-8"),
        user_name=current_user["anonymizedId"],
        user_display_name="AnonFit member",
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.PLATFORM,
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        exclude_credentials=_descriptors(existing),
    )
    await _store_challenge(options.challenge, "register", current_user["_id"])
    return json.loads(options_to_json(options))


@router.post(
    "/register/finish",
    response_model=PasskeyInfo,
    status_code=status.HTTP_201_CREATED,
    summary="Finish passkey enrollment",
)
async def finish_registration(
    payload: PasskeyRegisterFinish,
    request: Request,
    current_user: CurrentUserOnly,
) -> dict:
    rp_id, origin = _ceremony_context(request)
    challenge = await _consume_challenge(
        payload.credential, "register", current_user["_id"]
    )

    try:
        verified = verify_registration_response(
            credential=payload.credential,
            expected_challenge=challenge,
            expected_rp_id=rp_id,
            expected_origin=origin,
            require_user_verification=True,
        )
    except WebAuthnException as exc:
        logger.warning("Passkey enrollment rejected: %s", exc)
        await log_event(
            level="warning",
            category="security",
            event="auth.passkey_register_failed",
            message="Passkey enrollment could not be verified",
            actor_anonymized_id=current_user["anonymizedId"],
            metadata={"reason": type(exc).__name__},
        )
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Could not verify this device. Please try again.",
        ) from exc

    credential_id = bytes_to_base64url(verified.credential_id)
    if await webauthn_credentials.find_one({"credentialId": credential_id}):
        raise HTTPException(status.HTTP_409_CONFLICT, "This device is already enrolled.")

    now = utcnow()
    transports = [item for item in payload.transports if item in VALID_TRANSPORTS]
    doc = {
        "userId": current_user["_id"],
        "anonymizedId": current_user["anonymizedId"],
        "credentialId": credential_id,
        "publicKey": verified.credential_public_key,
        "signCount": int(verified.sign_count),
        "transports": transports,
        "deviceType": verified.credential_device_type.value,
        "backedUp": bool(verified.credential_backed_up),
        "label": (payload.label or "").strip() or "This device",
        "createdAt": now,
        "lastUsedAt": None,
    }

    try:
        await webauthn_credentials.insert_one(doc)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This device is already enrolled."
        ) from exc

    await users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"biometricEnabled": True, "updatedAt": now}},
    )
    await log_event(
        level="info",
        category="auth",
        event="auth.passkey_registered",
        message="Passkey enrolled for passwordless sign-in",
        actor_anonymized_id=current_user["anonymizedId"],
        metadata={
            "deviceType": doc["deviceType"],
            "backedUp": doc["backedUp"],
            "transportCount": len(transports),
        },
    )
    return _passkey_info(doc)


# ---------------------------------------------------------------------------
# Passwordless sign-in (public, discoverable credentials)
# ---------------------------------------------------------------------------
@router.post("/login/begin", summary="Start passwordless sign-in")
async def begin_login(request: Request) -> dict:
    rp_id, _ = _ceremony_context(request)

    # No allowCredentials: the authenticator offers the passkeys it holds for
    # this RP. That keeps the endpoint from revealing whether an email exists.
    options = generate_authentication_options(
        rp_id=rp_id,
        allow_credentials=[],
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    await _store_challenge(options.challenge, "login", None)
    return json.loads(options_to_json(options))


@router.post(
    "/login/finish",
    response_model=AuthResponse,
    summary="Finish passwordless sign-in",
)
async def finish_login(payload: PasskeyLoginFinish, request: Request) -> dict:
    rp_id, origin = _ceremony_context(request)
    challenge = await _consume_challenge(payload.credential, "login")

    credential_id = _presented_credential_id(payload.credential)
    stored = await webauthn_credentials.find_one({"credentialId": credential_id})
    if stored is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "This device is not enrolled for any account.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await users.find_one({"_id": stored["userId"]})
    if user is None or user.get("status") != AccountStatus.ACTIVE:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "This account cannot sign in right now.",
        )

    try:
        verified = verify_authentication_response(
            credential=payload.credential,
            expected_challenge=challenge,
            expected_rp_id=rp_id,
            expected_origin=origin,
            credential_public_key=bytes(stored["publicKey"]),
            credential_current_sign_count=int(stored.get("signCount", 0)),
            require_user_verification=True,
        )
    except WebAuthnException as exc:
        logger.warning("Passkey assertion rejected: %s", exc)
        await log_event(
            level="warning",
            category="security",
            event="auth.passkey_failed",
            message="Passwordless sign-in assertion was rejected",
            actor_anonymized_id=stored.get("anonymizedId"),
            metadata={"reason": type(exc).__name__},
        )
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Fingerprint verification failed. Try again or use your password.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    now = utcnow()
    await webauthn_credentials.update_one(
        {"_id": stored["_id"]},
        {"$set": {"signCount": int(verified.new_sign_count), "lastUsedAt": now}},
    )
    await users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "lastLoginAt": now,
                "failedLoginAttempts": 0,
                "lockedUntil": None,
                "updatedAt": now,
            }
        },
    )
    user.update(
        {"lastLoginAt": now, "failedLoginAttempts": 0, "lockedUntil": None, "updatedAt": now}
    )

    tokens = await issue_tokens(user)
    await log_event(
        level="info",
        category="auth",
        event="auth.passkey_login",
        message="Member signed in with a passkey",
        actor_anonymized_id=user["anonymizedId"],
    )
    return {**tokens, "user": user_public(user)}


# ---------------------------------------------------------------------------
# App-lock unlock (authenticated step-up)
# ---------------------------------------------------------------------------
@router.post("/unlock/begin", summary="Start an app-lock unlock")
async def begin_unlock(request: Request, current_user: CurrentUserOnly) -> dict:
    rp_id, _ = _ceremony_context(request)

    docs = await webauthn_credentials.find({"userId": current_user["_id"]}).to_list(20)
    if not docs:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No fingerprint is enrolled for this account.",
        )

    options = generate_authentication_options(
        rp_id=rp_id,
        allow_credentials=_descriptors(docs),
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    await _store_challenge(options.challenge, "unlock", current_user["_id"])
    return json.loads(options_to_json(options))


@router.post(
    "/unlock/finish",
    response_model=PasskeyVerify,
    summary="Verify a passkey to reveal the locked app",
)
async def finish_unlock(
    payload: PasskeyUnlockFinish,
    request: Request,
    current_user: CurrentUserOnly,
) -> dict:
    rp_id, origin = _ceremony_context(request)
    challenge = await _consume_challenge(payload.credential, "unlock", current_user["_id"])

    credential_id = _presented_credential_id(payload.credential)
    stored = await webauthn_credentials.find_one(
        {"credentialId": credential_id, "userId": current_user["_id"]}
    )
    if stored is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "This device is not enrolled for this account.",
        )

    try:
        verified = verify_authentication_response(
            credential=payload.credential,
            expected_challenge=challenge,
            expected_rp_id=rp_id,
            expected_origin=origin,
            credential_public_key=bytes(stored["publicKey"]),
            credential_current_sign_count=int(stored.get("signCount", 0)),
            require_user_verification=True,
        )
    except WebAuthnException as exc:
        await log_event(
            level="warning",
            category="security",
            event="auth.passkey_unlock_failed",
            message="App-lock unlock assertion was rejected",
            actor_anonymized_id=current_user["anonymizedId"],
            metadata={"reason": type(exc).__name__},
        )
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Fingerprint verification failed. Try again or use your password.",
        ) from exc

    now = utcnow()
    await webauthn_credentials.update_one(
        {"_id": stored["_id"]},
        {"$set": {"signCount": int(verified.new_sign_count), "lastUsedAt": now}},
    )
    await log_event(
        level="debug",
        category="auth",
        event="auth.passkey_unlocked",
        message="App lock released with a passkey assertion",
        actor_anonymized_id=current_user["anonymizedId"],
    )
    return {"verified": True, "anonymized_id": current_user["anonymizedId"]}


# ---------------------------------------------------------------------------
# Enrolled devices
# ---------------------------------------------------------------------------
@router.get("/credentials", response_model=PasskeyList, summary="List enrolled devices")
async def list_credentials(current_user: CurrentUserOnly) -> dict:
    return await _list_for_user(current_user["_id"])


@router.delete(
    "/credentials/{credential_id}",
    response_model=PasskeyList,
    summary="Remove an enrolled device",
)
async def delete_credential(credential_id: str, current_user: CurrentUserOnly) -> dict:
    result = await webauthn_credentials.delete_one(
        {"credentialId": credential_id, "userId": current_user["_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enrolled device not found.")

    remaining = await webauthn_credentials.count_documents({"userId": current_user["_id"]})
    if remaining == 0:
        await users.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"biometricEnabled": False, "updatedAt": utcnow()}},
        )

    await log_event(
        level="info",
        category="auth",
        event="auth.passkey_removed",
        message="Passkey removed from an account",
        actor_anonymized_id=current_user["anonymizedId"],
        metadata={"remainingDevices": remaining},
    )
    return await _list_for_user(current_user["_id"])
