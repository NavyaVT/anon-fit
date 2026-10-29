"""WebAuthn (passkey) documents.

The private key never leaves the authenticator — these rows hold only the public
key, a signature counter and display metadata. ``userId`` points at the identity
collection for internal lookups, but API responses are keyed by the anonymized
ID instead.
"""

from datetime import datetime

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field

#: Ceremony kinds. A challenge issued for one kind cannot satisfy another.
CHALLENGE_KINDS = ("register", "login", "unlock")


class WebAuthnCredentialDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: ObjectId | None = Field(default=None, alias="_id")
    userId: ObjectId
    anonymizedId: str
    credentialId: str  # base64url
    publicKey: bytes
    signCount: int = 0
    transports: list[str] = []
    deviceType: str | None = None
    backedUp: bool = False
    label: str = "This device"
    createdAt: datetime
    lastUsedAt: datetime | None = None


class WebAuthnChallengeDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: ObjectId | None = Field(default=None, alias="_id")
    challenge: str  # base64url
    kind: str
    userId: ObjectId | None = None
    createdAt: datetime
    expiresAt: datetime
