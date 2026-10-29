"""User profile schemas."""

from datetime import datetime

from pydantic import EmailStr, Field, field_validator

from app.models.user import AccountStatus, UserRole
from app.schemas.base import CamelModel


class UserPublic(CamelModel):
    """Full profile returned only to the authenticated user themselves."""

    id: str
    email: EmailStr
    role: UserRole
    status: AccountStatus
    anonymized_id: str
    biometric_enabled: bool
    pin_enabled: bool = False
    created_at: datetime
    last_login_at: datetime | None = None


class PinSetRequest(CamelModel):
    """Set or replace the 4-digit app-lock PIN.

    The PIN is a convenience gate for the signed-in session on this device —
    never a substitute for the password, so it is deliberately short and
    always stored as a hash.
    """

    pin: str
    current_pin: str | None = None
    current_password: str | None = None

    @field_validator("pin")
    @classmethod
    def pin_format(cls, value: str) -> str:
        pin = value.strip()
        if not pin.isdigit() or len(pin) != 4:
            raise ValueError("PIN must be exactly 4 digits")
        if len(set(pin)) == 1:
            raise ValueError("Choose a less predictable PIN")
        return pin


class PinVerifyRequest(CamelModel):
    pin: str = Field(min_length=1, max_length=8)


class PinRemoveRequest(CamelModel):
    current_pin: str | None = None
    current_password: str | None = None


class PinActionResponse(CamelModel):
    message: str
    pin_enabled: bool


class Message(CamelModel):
    message: str = Field(min_length=1)
