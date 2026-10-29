"""Convert MongoDB documents into API-safe dictionaries.

Only the user's own profile serializer ever exposes an email address. Health
and admin serializers are intentionally blind to identity fields.
"""

from datetime import datetime
from typing import Any

from bson import ObjectId

from app.utils.dates import as_utc
from app.utils.youtube import format_timestamp


def _id_str(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _dt(value: datetime | None) -> datetime | None:
    return as_utc(value)


def user_public(doc: dict) -> dict:
    """Profile representation for the authenticated user themselves."""
    return {
        "id": _id_str(doc["_id"]),
        "email": doc["email"],
        "role": doc.get("role", "user"),
        "status": doc.get("status", "active"),
        "anonymized_id": doc["anonymizedId"],
        "biometric_enabled": bool(doc.get("biometricEnabled", False)),
        "pin_enabled": bool(doc.get("pinHash")),
        "created_at": _dt(doc.get("createdAt")),
        "last_login_at": _dt(doc.get("lastLoginAt")),
    }


def health_day(doc: dict | None) -> dict | None:
    """One anonymized day of health metrics (no identity fields)."""
    if not doc:
        return None
    return {
        "date": doc.get("date"),
        "water_glasses": int(doc.get("waterGlasses", 0)),
        "screen_time_hours": doc.get("screenTimeHours"),
        "most_used_app": doc.get("mostUsedApp"),
        "sleep_hours": doc.get("sleepHours"),
        "workout_completed": bool(doc.get("workoutCompleted", False)),
        "completed_exercises": list(doc.get("completedExercises", [])),
        "plan_id": _id_str(doc.get("planId")),
        "updated_at": _dt(doc.get("updatedAt")),
    }


def exercise_public(exercise: dict, index: int, completed: bool = False) -> dict:
    start = int(exercise.get("startSeconds", 0))
    return {
        "index": index,
        "name": exercise.get("name", ""),
        "start_seconds": start,
        "timestamp": format_timestamp(start),
        "completed": completed,
    }


def workout_plan_public(doc: dict) -> dict:
    exercises = doc.get("exercises", [])
    return {
        "id": _id_str(doc["_id"]),
        "title": doc["title"],
        "youtube_url": doc.get("youtubeUrl"),
        "video_id": doc.get("videoId"),
        "exercises": [exercise_public(ex, i) for i, ex in enumerate(exercises)],
        "exercise_count": len(exercises),
        "created_at": _dt(doc.get("createdAt")),
    }


def audit_entry(doc: dict) -> dict:
    return {
        "id": _id_str(doc["_id"]),
        "actor_anonymized_id": doc.get("actorAnonymizedId", "system"),
        "action": doc.get("action", "unknown"),
        "target_anonymized_id": doc.get("targetAnonymizedId"),
        "metadata": doc.get("metadata", {}),
        "created_at": _dt(doc.get("createdAt")),
    }


def object_id(value: str) -> ObjectId | None:
    """Safely convert a string to ObjectId (None when invalid)."""
    try:
        return ObjectId(value)
    except Exception:
        return None
