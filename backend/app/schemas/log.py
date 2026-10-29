"""Admin-facing schemas for the system log table."""

from datetime import datetime
from typing import Literal

from app.schemas.base import CamelModel

LogLevel = Literal["debug", "info", "warning", "error", "critical"]


class SystemLogEntry(CamelModel):
    id: str
    level: LogLevel
    category: str
    event: str
    message: str
    actor_anonymized_id: str | None = None
    identifier_fingerprint: str | None = None
    metadata: dict = {}
    created_at: datetime


class SystemLogPage(CamelModel):
    items: list[SystemLogEntry]
    page: int
    limit: int
    total: int
    pages: int


class LogLevelCount(CamelModel):
    level: str
    count: int


class LogEventCount(CamelModel):
    event: str
    count: int


class SystemLogStats(CamelModel):
    total: int
    last_24h: int
    warnings_24h: int
    errors_24h: int
    security_events_24h: int
    by_level: list[LogLevelCount] = []
    top_events: list[LogEventCount] = []
    generated_at: datetime
