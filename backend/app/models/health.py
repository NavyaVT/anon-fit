"""Health documents.

Every document in these collections is keyed by ``anonymizedId`` and contains
no email, name, phone number or other direct identifier.
"""

from datetime import datetime

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field


class ExerciseDocument(BaseModel):
    name: str
    startSeconds: int = 0


class WorkoutPlanDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: ObjectId | None = Field(default=None, alias="_id")
    anonymizedId: str
    title: str
    youtubeUrl: str | None = None
    videoId: str | None = None
    exercises: list[ExerciseDocument] = []
    createdAt: datetime
    updatedAt: datetime


class HealthDataDocument(BaseModel):
    """One document per user per day."""

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: ObjectId | None = Field(default=None, alias="_id")
    anonymizedId: str
    date: str  # YYYY-MM-DD (UTC)

    waterGlasses: int = 0
    screenTimeHours: float | None = None
    mostUsedApp: str | None = None
    sleepHours: float | None = None

    planId: ObjectId | None = None
    completedExercises: list[int] = []
    workoutCompleted: bool = False

    createdAt: datetime
    updatedAt: datetime
