"""Workout & daily health tracking schemas."""

from datetime import date, datetime

from pydantic import Field, field_validator, model_validator

from app.schemas.base import CamelModel
from app.utils.dates import today_str

# How far back a user may edit daily metrics (prevents accidental history rewrites).
MAX_BACKFILL_DAYS = 60


def _validate_tracking_date(value: str | None) -> str | None:
    if value is None:
        return value
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("date must use YYYY-MM-DD format") from exc
    today = date.fromisoformat(today_str())
    if parsed > today:
        raise ValueError("You cannot log health data in the future")
    if (today - parsed).days > MAX_BACKFILL_DAYS:
        raise ValueError(f"You can only edit the last {MAX_BACKFILL_DAYS} days")
    return value


class ExerciseIn(CamelModel):
    name: str = Field(min_length=1, max_length=80)
    start_seconds: int = Field(default=0, ge=0, le=43_200)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Exercise name cannot be empty")
        return cleaned


class WorkoutPlanCreate(CamelModel):
    title: str = Field(min_length=1, max_length=80)
    youtube_url: str | None = Field(default=None, max_length=500)
    exercises: list[ExerciseIn] = Field(min_length=1, max_length=30)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Title cannot be empty")
        return cleaned


class ExercisePublic(CamelModel):
    index: int
    name: str
    start_seconds: int
    timestamp: str
    completed: bool = False


class WorkoutPlanPublic(CamelModel):
    id: str
    title: str
    youtube_url: str | None = None
    video_id: str | None = None
    exercises: list[ExercisePublic]
    exercise_count: int
    created_at: datetime


class WorkoutToday(CamelModel):
    plan_id: str
    title: str
    youtube_url: str | None = None
    video_id: str | None = None
    exercises: list[ExercisePublic]
    completed_count: int
    total: int
    completed: bool


class WeeklyPoint(CamelModel):
    date: str
    label: str
    water_glasses: int
    screen_time_hours: float | None = None
    sleep_hours: float | None = None
    workout_completed: bool = False


class TodayResponse(CamelModel):
    date: str
    water_glasses: int
    water_goal: int
    screen_time_hours: float | None = None
    most_used_app: str | None = None
    sleep_hours: float | None = None
    sleep_goal: float
    workout: WorkoutToday | None = None
    streak: int
    weekly: list[WeeklyPoint]


class HealthDayPublic(CamelModel):
    date: str
    water_glasses: int
    screen_time_hours: float | None = None
    most_used_app: str | None = None
    sleep_hours: float | None = None
    workout_completed: bool = False
    completed_exercises: list[int] = []
    plan_id: str | None = None
    updated_at: datetime | None = None


class WaterUpdate(CamelModel):
    glasses: int = Field(ge=0, le=30)
    date: str | None = None

    @field_validator("date")
    @classmethod
    def valid_date(cls, value: str | None) -> str | None:
        return _validate_tracking_date(value)


class MetricsUpdate(CamelModel):
    """User-reported phone & sleep stats. All fields optional, at least one."""

    screen_time_hours: float | None = Field(default=None, ge=0, le=24)
    most_used_app: str | None = Field(default=None, max_length=60)
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    date: str | None = None

    @field_validator("most_used_app")
    @classmethod
    def clean_app(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("date")
    @classmethod
    def valid_date(cls, value: str | None) -> str | None:
        return _validate_tracking_date(value)

    @model_validator(mode="after")
    def at_least_one_metric(self) -> "MetricsUpdate":
        if (
            self.screen_time_hours is None
            and self.most_used_app is None
            and self.sleep_hours is None
        ):
            raise ValueError("Provide at least one metric to update")
        return self


class ToggleExerciseResponse(CamelModel):
    date: str
    plan_id: str
    completed_exercises: list[int]
    completed_count: int
    total: int
    workout_completed: bool
    streak: int


class HistoryResponse(CamelModel):
    days: list[HealthDayPublic]
    streak: int


class PlanListResponse(CamelModel):
    plans: list[WorkoutPlanPublic]
