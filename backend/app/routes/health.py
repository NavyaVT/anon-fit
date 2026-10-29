"""Health tracking & workout routes.

Every query in this module is scoped by ``current_user["anonymizedId"]``.
No PII is ever read or written here — these endpoints never need an email.
"""

from datetime import date as date_cls

from fastapi import APIRouter, HTTPException, Query, status
from pymongo import ReturnDocument

from app.auth.dependencies import CurrentUserOnly
from app.database import health_data, workout_plans
from app.schemas.health import (
    HealthDayPublic,
    HistoryResponse,
    MetricsUpdate,
    PlanListResponse,
    TodayResponse,
    ToggleExerciseResponse,
    WaterUpdate,
    WeeklyPoint,
    WorkoutPlanCreate,
    WorkoutPlanPublic,
    WorkoutToday,
)
from app.schemas.user import Message
from app.utils.dates import calculate_streak, last_n_dates, today_str, utcnow
from app.utils.logging_store import log_event
from app.utils.serializers import (
    exercise_public,
    health_day,
    object_id,
    workout_plan_public,
)
from app.utils.youtube import parse_youtube_url

router = APIRouter(prefix="/health", tags=["Health & Workouts"])

WATER_GOAL = 8
SLEEP_GOAL = 8.0
MAX_STREAK_LOOKBACK = 365


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
async def _ensure_day(anonymized_id: str, day: str) -> dict:
    """Return today's health document, creating it atomically if needed."""
    now = utcnow()
    return await health_data.find_one_and_update(
        {"anonymizedId": anonymized_id, "date": day},
        {
            "$setOnInsert": {
                "anonymizedId": anonymized_id,
                "date": day,
                "waterGlasses": 0,
                "screenTimeHours": None,
                "mostUsedApp": None,
                "sleepHours": None,
                "planId": None,
                "completedExercises": [],
                "workoutCompleted": False,
                "createdAt": now,
            },
            "$set": {"updatedAt": now},
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )


async def _get_day(anonymized_id: str, day: str) -> dict | None:
    return await health_data.find_one({"anonymizedId": anonymized_id, "date": day})


async def _get_streak(anonymized_id: str) -> int:
    cursor = (
        health_data.find(
            {"anonymizedId": anonymized_id, "workoutCompleted": True},
            {"date": 1},
        )
        .sort("date", -1)
        .limit(MAX_STREAK_LOOKBACK)
    )
    completed_dates = {doc["date"] async for doc in cursor}
    return calculate_streak(completed_dates)


def _empty_day(anonymized_id: str, day: str) -> dict:
    return {
        "anonymizedId": anonymized_id,
        "date": day,
        "waterGlasses": 0,
        "screenTimeHours": None,
        "mostUsedApp": None,
        "sleepHours": None,
        "planId": None,
        "completedExercises": [],
        "workoutCompleted": False,
        "updatedAt": None,
    }


async def _weekly_points(anonymized_id: str) -> list[dict]:
    """Last 7 days, zero-filled, oldest first."""
    dates = last_n_dates(7)
    docs = {}
    cursor = health_data.find(
        {"anonymizedId": anonymized_id, "date": {"$in": dates}}
    )
    async for doc in cursor:
        docs[doc["date"]] = doc

    points = []
    for day in dates:
        doc = docs.get(day, {})
        points.append(
            {
                "date": day,
                "label": date_cls.fromisoformat(day).strftime("%a"),
                "water_glasses": int(doc.get("waterGlasses", 0)),
                "screen_time_hours": doc.get("screenTimeHours"),
                "sleep_hours": doc.get("sleepHours"),
                "workout_completed": bool(doc.get("workoutCompleted", False)),
            }
        )
    return points


async def _build_today_workout(anonymized_id: str, day_doc: dict | None) -> dict | None:
    """Resolve today's plan and merge it with the user's checklist state."""
    plan = None
    plan_id = day_doc.get("planId") if day_doc else None
    if plan_id:
        plan = await workout_plans.find_one(
            {"_id": plan_id, "anonymizedId": anonymized_id}
        )

    if plan is None:
        # Fall back to the most recently created plan.
        plan = await workout_plans.find_one(
            {"anonymizedId": anonymized_id}, sort=[("createdAt", -1)]
        )
    if plan is None:
        return None

    completed: set[int] = set()
    if day_doc and day_doc.get("planId") == plan["_id"]:
        completed = set(int(i) for i in day_doc.get("completedExercises", []))

    exercises = plan.get("exercises", [])
    exercise_items = [
        exercise_public(ex, index, completed=index in completed)
        for index, ex in enumerate(exercises)
    ]
    completed_count = sum(1 for item in exercise_items if item["completed"])
    total = len(exercise_items)

    return {
        "plan_id": str(plan["_id"]),
        "title": plan["title"],
        "youtube_url": plan.get("youtubeUrl"),
        "video_id": plan.get("videoId"),
        "exercises": exercise_items,
        "completed_count": completed_count,
        "total": total,
        "completed": total > 0 and completed_count == total,
    }


# ---------------------------------------------------------------------------
# Daily dashboard
# ---------------------------------------------------------------------------
@router.get("/today", response_model=TodayResponse, summary="Today's dashboard data")
async def get_today(current_user: CurrentUserOnly) -> dict:
    anon_id = current_user["anonymizedId"]
    today = today_str()
    day_doc = await _get_day(anon_id, today)

    workout = await _build_today_workout(anon_id, day_doc)
    streak = await _get_streak(anon_id)
    weekly = await _weekly_points(anon_id)

    return {
        "date": today,
        "water_glasses": int(day_doc.get("waterGlasses", 0)) if day_doc else 0,
        "water_goal": WATER_GOAL,
        "screen_time_hours": day_doc.get("screenTimeHours") if day_doc else None,
        "most_used_app": day_doc.get("mostUsedApp") if day_doc else None,
        "sleep_hours": day_doc.get("sleepHours") if day_doc else None,
        "sleep_goal": SLEEP_GOAL,
        "workout": workout,
        "streak": streak,
        "weekly": weekly,
    }


@router.patch(
    "/water",
    response_model=HealthDayPublic,
    summary="Set water intake for a day",
)
async def update_water(payload: WaterUpdate, current_user: CurrentUserOnly) -> dict:
    anon_id = current_user["anonymizedId"]
    day = payload.date or today_str()
    await _ensure_day(anon_id, day)

    updated = await health_data.find_one_and_update(
        {"anonymizedId": anon_id, "date": day},
        {"$set": {"waterGlasses": payload.glasses, "updatedAt": utcnow()}},
        return_document=ReturnDocument.AFTER,
    )
    await log_event(
        level="debug",
        category="data",
        event="health.water_updated",
        message=f"Water intake set to {payload.glasses} glass(es)",
        actor_anonymized_id=anon_id,
        metadata={"date": day, "glasses": payload.glasses},
    )
    return health_day(updated)


@router.patch(
    "/metrics",
    response_model=HealthDayPublic,
    summary="Save phone screen-time, most-used app and sleep",
)
async def update_metrics(payload: MetricsUpdate, current_user: CurrentUserOnly) -> dict:
    anon_id = current_user["anonymizedId"]
    day = payload.date or today_str()
    await _ensure_day(anon_id, day)

    changes: dict = {"updatedAt": utcnow()}
    if payload.screen_time_hours is not None:
        changes["screenTimeHours"] = round(payload.screen_time_hours, 2)
    if payload.most_used_app is not None:
        changes["mostUsedApp"] = payload.most_used_app
    if payload.sleep_hours is not None:
        changes["sleepHours"] = round(payload.sleep_hours, 2)

    updated = await health_data.find_one_and_update(
        {"anonymizedId": anon_id, "date": day},
        {"$set": changes},
        return_document=ReturnDocument.AFTER,
    )
    await log_event(
        level="debug",
        category="data",
        event="health.metrics_saved",
        message="Phone statistics saved for the day",
        actor_anonymized_id=anon_id,
        metadata={"date": day},
    )
    return health_day(updated)


@router.get(
    "/history",
    response_model=HistoryResponse,
    summary="Daily health history",
)
async def get_history(
    current_user: CurrentUserOnly,
    days: int = Query(default=14, ge=1, le=90),
) -> dict:
    anon_id = current_user["anonymizedId"]
    dates = last_n_dates(days)
    docs = {}
    cursor = health_data.find({"anonymizedId": anon_id, "date": {"$in": dates}})
    async for doc in cursor:
        docs[doc["date"]] = doc

    return {
        "days": [
            health_day(docs.get(day) or _empty_day(anon_id, day))
            for day in dates
        ],
        "streak": await _get_streak(anon_id),
    }


# ---------------------------------------------------------------------------
# Workout plans
# ---------------------------------------------------------------------------
@router.post(
    "/plans",
    response_model=WorkoutPlanPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create a workout plan from a YouTube video",
)
async def create_plan(payload: WorkoutPlanCreate, current_user: CurrentUserOnly) -> dict:
    anon_id = current_user["anonymizedId"]
    youtube_url = None
    video_id = None

    if payload.youtube_url and payload.youtube_url.strip():
        try:
            youtube_url, video_id = parse_youtube_url(payload.youtube_url)
        except ValueError as exc:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)
            ) from exc

    now = utcnow()
    doc = {
        "anonymizedId": anon_id,
        "title": payload.title,
        "youtubeUrl": youtube_url,
        "videoId": video_id,
        "exercises": [
            {"name": ex.name, "startSeconds": ex.start_seconds}
            for ex in payload.exercises
        ],
        "createdAt": now,
        "updatedAt": now,
    }
    result = await workout_plans.insert_one(doc)
    doc["_id"] = result.inserted_id
    await log_event(
        level="info",
        category="data",
        event="workout.plan_created",
        message=f"Workout plan created: {payload.title}",
        actor_anonymized_id=anon_id,
        metadata={
            "planId": str(result.inserted_id),
            "exerciseCount": len(payload.exercises),
            "hasVideo": bool(video_id),
        },
    )
    return workout_plan_public(doc)


@router.get(
    "/plans",
    response_model=PlanListResponse,
    summary="List my workout plans",
)
async def list_plans(current_user: CurrentUserOnly) -> dict:
    anon_id = current_user["anonymizedId"]
    cursor = workout_plans.find({"anonymizedId": anon_id}).sort("createdAt", -1).limit(100)
    plans = [workout_plan_public(doc) async for doc in cursor]
    return {"plans": plans}


@router.get(
    "/plans/{plan_id}",
    response_model=WorkoutPlanPublic,
    summary="Get one workout plan",
)
async def get_plan(plan_id: str, current_user: CurrentUserOnly) -> dict:
    oid = object_id(plan_id)
    if oid is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workout plan not found")

    plan = await workout_plans.find_one(
        {"_id": oid, "anonymizedId": current_user["anonymizedId"]}
    )
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workout plan not found")
    return workout_plan_public(plan)


@router.delete(
    "/plans/{plan_id}",
    response_model=Message,
    summary="Delete one of my workout plans",
)
async def delete_plan(plan_id: str, current_user: CurrentUserOnly) -> Message:
    oid = object_id(plan_id)
    anon_id = current_user["anonymizedId"]
    if oid is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workout plan not found")

    result = await workout_plans.delete_one({"_id": oid, "anonymizedId": anon_id})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workout plan not found")

    # Detach the plan from any daily checklist that referenced it.
    await health_data.update_many(
        {"anonymizedId": anon_id, "planId": oid},
        {
            "$set": {
                "planId": None,
                "completedExercises": [],
                "workoutCompleted": False,
                "updatedAt": utcnow(),
            }
        },
    )
    await log_event(
        level="info",
        category="data",
        event="workout.plan_deleted",
        message="Workout plan deleted",
        actor_anonymized_id=anon_id,
        metadata={"planId": plan_id},
    )
    return Message(message="Workout plan deleted")


@router.post(
    "/plans/{plan_id}/exercises/{exercise_index}/toggle",
    response_model=ToggleExerciseResponse,
    summary="Check / uncheck an exercise for today",
)
async def toggle_exercise(
    plan_id: str,
    exercise_index: int,
    current_user: CurrentUserOnly,
    day: str | None = Query(default=None, description="YYYY-MM-DD, defaults to today"),
) -> dict:
    anon_id = current_user["anonymizedId"]
    oid = object_id(plan_id)
    if oid is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workout plan not found")

    plan = await workout_plans.find_one({"_id": oid, "anonymizedId": anon_id})
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workout plan not found")

    exercises = plan.get("exercises", [])
    if exercise_index < 0 or exercise_index >= len(exercises):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")

    target_day = day or today_str()
    if target_day > today_str():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Date cannot be in the future")

    day_doc = await _ensure_day(anon_id, target_day)

    # Switching plans resets the checklist for the new plan.
    completed = (
        set(int(i) for i in day_doc.get("completedExercises", []))
        if day_doc.get("planId") == oid
        else set()
    )

    if exercise_index in completed:
        completed.discard(exercise_index)
    else:
        completed.add(exercise_index)

    completed_list = sorted(completed)
    workout_completed = len(completed_list) == len(exercises) and len(exercises) > 0
    was_completed = bool(day_doc.get("workoutCompleted"))

    updated = await health_data.find_one_and_update(
        {"anonymizedId": anon_id, "date": target_day},
        {
            "$set": {
                "planId": oid,
                "completedExercises": completed_list,
                "workoutCompleted": workout_completed,
                "updatedAt": utcnow(),
            }
        },
        return_document=ReturnDocument.AFTER,
    )

    if workout_completed and not was_completed:
        await log_event(
            level="info",
            category="data",
            event="workout.completed",
            message=f"Workout completed: {plan.get('title', 'plan')}",
            actor_anonymized_id=anon_id,
            metadata={"date": target_day, "planId": plan_id, "exercises": len(exercises)},
        )

    return {
        "date": target_day,
        "plan_id": plan_id,
        "completed_exercises": updated.get("completedExercises", []),
        "completed_count": len(completed_list),
        "total": len(exercises),
        "workout_completed": workout_completed,
        "streak": await _get_streak(anon_id),
    }