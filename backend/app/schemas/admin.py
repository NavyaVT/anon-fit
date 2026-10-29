"""Admin schemas — anonymized data only.

None of these models contain email, name, phone, password hash or any other
direct identifier. That is enforced by construction: admin routes never
serialize a user document through them.
"""

from datetime import datetime
from typing import Literal

from app.models.user import AccountStatus
from app.schemas.base import CamelModel
from app.schemas.health import HealthDayPublic


class AdminWeeklyPoint(CamelModel):
    date: str
    label: str
    avg_screen_time_hours: float | None = None
    avg_sleep_hours: float | None = None
    workout_completion_rate: float = 0.0
    tracked_users: int = 0


class AdminStats(CamelModel):
    total_users: int
    active_users: int
    suspended_users: int
    deleted_users: int
    avg_screen_time_hours: float | None = None
    avg_sleep_hours: float | None = None
    avg_water_glasses: float = 0.0
    workout_completion_rate: float = 0.0
    tracked_days: int = 0
    weekly: list[AdminWeeklyPoint] = []
    generated_at: datetime


class AnonLatest(CamelModel):
    date: str
    water_glasses: int
    screen_time_hours: float | None = None
    most_used_app: str | None = None
    sleep_hours: float | None = None
    workout_completed: bool = False
    updated_at: datetime | None = None


class AnonUserRow(CamelModel):
    anonymized_id: str
    status: AccountStatus
    created_at: datetime
    last_active_at: datetime | None = None
    latest: AnonLatest | None = None
    streak: int = 0
    tracking_days: int = 0
    completion_rate_7d: float = 0.0


class AdminUsersPage(CamelModel):
    items: list[AnonUserRow]
    page: int
    limit: int
    total: int
    pages: int


class AdminUserDetail(CamelModel):
    anonymized_id: str
    status: AccountStatus
    created_at: datetime
    streak: int = 0
    tracking_days: int = 0
    completion_rate_7d: float = 0.0
    history: list[HealthDayPublic] = []


class StatusUpdate(CamelModel):
    status: Literal["active", "suspended"]


class AdminActionResponse(CamelModel):
    message: str
    anonymized_id: str
    status: AccountStatus


class AuditEntry(CamelModel):
    id: str
    actor_anonymized_id: str
    action: str
    target_anonymized_id: str | None = None
    metadata: dict = {}
    created_at: datetime


class AuditPage(CamelModel):
    items: list[AuditEntry]
    page: int
    limit: int
    total: int
    pages: int
