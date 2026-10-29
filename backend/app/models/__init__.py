"""Typed MongoDB document models used by the API."""

from app.models.audit import AuditLogDocument
from app.models.health import HealthDataDocument, WorkoutPlanDocument
from app.models.log import LOG_CATEGORIES, LOG_LEVELS, SystemLogDocument
from app.models.user import AccountStatus, UserDocument, UserRole
from app.models.webauthn import (
    CHALLENGE_KINDS,
    WebAuthnChallengeDocument,
    WebAuthnCredentialDocument,
)

__all__ = [
    "AccountStatus",
    "AuditLogDocument",
    "CHALLENGE_KINDS",
    "HealthDataDocument",
    "LOG_CATEGORIES",
    "LOG_LEVELS",
    "SystemLogDocument",
    "UserDocument",
    "UserRole",
    "WebAuthnChallengeDocument",
    "WebAuthnCredentialDocument",
    "WorkoutPlanDocument",
]
