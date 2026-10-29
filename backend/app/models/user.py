"""User document living in the `users` collection.

This is the ONLY collection that stores real identity (email + password hash).
Health data is linked to a user exclusively through the opaque
``anonymizedId``.
"""

from datetime import datetime
from enum import Enum

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class AccountStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class UserDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: ObjectId | None = Field(default=None, alias="_id")
    email: str
    passwordHash: str
    role: UserRole = UserRole.USER
    status: AccountStatus = AccountStatus.ACTIVE
    anonymizedId: str
    biometricEnabled: bool = False

    # 4-digit app-lock PIN (bcrypt hash only, never the digits themselves).
    pinHash: str | None = None

    # Brute-force protection
    failedLoginAttempts: int = 0
    lockedUntil: datetime | None = None
    pinFailedAttempts: int = 0
    pinLockedUntil: datetime | None = None

    # Lifecycle timestamps
    createdAt: datetime
    updatedAt: datetime
    lastLoginAt: datetime | None = None
    deletedAt: datetime | None = None
