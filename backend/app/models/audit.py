"""Audit log document for administrative actions.

Audit entries deliberately reference anonymized identifiers only — never an
admin's or user's email address.
"""

from datetime import datetime

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field


class AuditLogDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: ObjectId | None = Field(default=None, alias="_id")
    actorAnonymizedId: str
    actorRole: str = "admin"
    action: str
    targetAnonymizedId: str | None = None
    metadata: dict = {}
    createdAt: datetime
