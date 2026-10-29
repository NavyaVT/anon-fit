"""System log document — one row per application event.

Written by :func:`app.utils.logging_store.log_event` and surfaced to admins
through ``/admin/logs``. No email, name or password is ever stored here; see the
privacy note in ``logging_store``.
"""

from datetime import datetime

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field

LOG_LEVELS = ("debug", "info", "warning", "error", "critical")
LOG_CATEGORIES = ("auth", "security", "admin", "data", "system")


class SystemLogDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: ObjectId | None = Field(default=None, alias="_id")
    level: str = "info"
    category: str = "system"
    event: str
    message: str
    actorAnonymizedId: str | None = None
    identifierFingerprint: str | None = None
    metadata: dict = {}
    createdAt: datetime
