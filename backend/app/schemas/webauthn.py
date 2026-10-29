"""Request / response schemas for the passkey ceremonies."""

from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class _CredentialPayload(CamelModel):
    """A `PublicKeyCredential` serialized by the browser (WebAuthn JSON format)."""

    credential: dict


class PasskeyRegisterFinish(_CredentialPayload):
    label: str | None = Field(default=None, max_length=60)
    transports: list[str] = []


class PasskeyLoginFinish(_CredentialPayload):
    pass


class PasskeyUnlockFinish(_CredentialPayload):
    pass


class PasskeyInfo(CamelModel):
    id: str
    label: str
    device_type: str | None = None
    backed_up: bool = False
    created_at: datetime
    last_used_at: datetime | None = None


class PasskeyList(CamelModel):
    enabled: bool
    items: list[PasskeyInfo] = []


class PasskeyVerify(CamelModel):
    verified: bool
    anonymized_id: str | None = None
