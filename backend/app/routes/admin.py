"""Administrator routes — anonymized analytics only.

Hard privacy rule for this module:
  * Responses are built exclusively from `anonymizedId`, status and health
    metrics. Email / password hash / name never leave the database here.
  * User documents are only read internally to resolve an anonymized id for
    lifecycle actions (suspend, reactivate, soft delete).
"""

import math
import re
from datetime import date as date_cls
from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.auth.dependencies import CurrentAdmin
from app.auth.sessions import revoke_all_refresh_tokens
from app.database import audit_logs, health_data, system_logs, users
from app.models.user import AccountStatus, UserRole
from app.schemas.admin import (
    AdminActionResponse,
    AdminStats,
    AdminUserDetail,
    AdminUsersPage,
    AdminWeeklyPoint,
    AnonLatest,
    AnonUserRow,
    AuditEntry,
    AuditPage,
    StatusUpdate,
)
from app.schemas.health import HealthDayPublic
from app.schemas.log import (
    SystemLogEntry,
    SystemLogPage,
    SystemLogStats,
)
from app.utils.audit import record_audit
from app.utils.dates import as_utc, calculate_streak, last_n_dates, today_str, utcnow
from app.utils.logging_store import log_event
from app.utils.serializers import health_day

router = APIRouter(prefix="/admin", tags=["Admin (anonymized)"])

MAX_PAGE_SIZE = 50
LATEST_LOOKBACK = 60


def _avg(values: list[float | None]) -> float | None:
    cleaned = [float(v) for v in values if v is not None]
    if not cleaned:
        return None
    return round(sum(cleaned) / len(cleaned), 2)


def _rate(completed: int, total: int) -> float:
    return round(completed / total, 3) if total else 0.0


def _latest_public(doc: dict | None) -> dict | None:
    if not doc:
        return None
    return {
        "date": doc.get("date"),
        "water_glasses": int(doc.get("waterGlasses", 0)),
        "screen_time_hours": doc.get("screenTimeHours"),
        "most_used_app": doc.get("mostUsedApp"),
        "sleep_hours": doc.get("sleepHours"),
        "workout_completed": bool(doc.get("workoutCompleted", False)),
        "updated_at": as_utc(doc.get("updatedAt")),
    }


def _compute_rates(health_docs: list[dict]) -> tuple[int, float, int]:
    """Return (tracking_days, completion_rate_7d, streak)."""
    dates = {doc["date"] for doc in health_docs}
    completed_dates = {doc["date"] for doc in health_docs if doc.get("workoutCompleted")}
    last_week = set(last_n_dates(7))
    completed_this_week = len(completed_dates & last_week)
    return (
        len(dates),
        _rate(completed_this_week, 7),
        calculate_streak(completed_dates),
    )


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
@router.get("/stats", response_model=AdminStats, summary="Anonymized platform statistics")
async def get_stats(_: CurrentAdmin) -> dict:
    total_users = await users.count_documents({"role": UserRole.USER.value})
    active_users = await users.count_documents(
        {"role": UserRole.USER.value, "status": AccountStatus.ACTIVE.value}
    )
    suspended_users = await users.count_documents(
        {"role": UserRole.USER.value, "status": AccountStatus.SUSPENDED.value}
    )
    deleted_users = await users.count_documents(
        {"role": UserRole.USER.value, "status": AccountStatus.DELETED.value}
    )

    dates = last_n_dates(7)
    docs = await health_data.find({"date": {"$in": dates}}).to_list(length=None)

    avg_screen = _avg([doc.get("screenTimeHours") for doc in docs])
    avg_sleep = _avg([doc.get("sleepHours") for doc in docs])
    avg_water = _avg([doc.get("waterGlasses", 0) for doc in docs]) or 0.0
    completed = sum(1 for doc in docs if doc.get("workoutCompleted"))

    by_date: dict[str, list[dict]] = {day: [] for day in dates}
    for doc in docs:
        by_date.setdefault(doc["date"], []).append(doc)

    weekly = []
    for day in dates:
        day_docs = by_date.get(day, [])
        day_completed = sum(1 for doc in day_docs if doc.get("workoutCompleted"))
        weekly.append(
            {
                "date": day,
                "label": date_cls.fromisoformat(day).strftime("%a"),
                "avg_screen_time_hours": _avg([d.get("screenTimeHours") for d in day_docs]),
                "avg_sleep_hours": _avg([d.get("sleepHours") for d in day_docs]),
                "workout_completion_rate": _rate(day_completed, len(day_docs)),
                "tracked_users": len(day_docs),
            }
        )

    return {
        "total_users": total_users,
        "active_users": active_users,
        "suspended_users": suspended_users,
        "deleted_users": deleted_users,
        "avg_screen_time_hours": avg_screen,
        "avg_sleep_hours": avg_sleep,
        "avg_water_glasses": round(float(avg_water), 2),
        "workout_completion_rate": _rate(completed, len(docs)),
        "tracked_days": len(docs),
        "weekly": weekly,
        "generated_at": utcnow(),
    }


# ---------------------------------------------------------------------------
# Anonymized user directory
# ---------------------------------------------------------------------------
@router.get("/users", response_model=AdminUsersPage, summary="List anonymized users")
async def list_users(
    _: CurrentAdmin,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=MAX_PAGE_SIZE),
    status_filter: Literal["all", "active", "suspended", "deleted"] = Query(
        default="all", alias="status"
    ),
    search: str | None = Query(default=None, max_length=50),
) -> dict:
    match: dict = {"role": UserRole.USER.value}
    if status_filter != "all":
        match["status"] = status_filter
    if search:
        # Escape user input before using it in a regex.
        match["anonymizedId"] = {"$regex": re.escape(search.strip()), "$options": "i"}

    total = await users.count_documents(match)
    pages = math.ceil(total / limit) if total else 0
    skip = (page - 1) * limit

    pipeline = [
        {"$match": match},
        {"$sort": {"createdAt": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {
            "$lookup": {
                "from": "health_data",
                "let": {"anon": "$anonymizedId"},
                "pipeline": [
                    {"$match": {"$expr": {"$eq": ["$anonymizedId", "$$anon"]}}},
                    {"$sort": {"date": -1}},
                    {"$limit": LATEST_LOOKBACK},
                ],
                "as": "health",
            }
        },
    ]

    items = []
    async for doc in users.aggregate(pipeline):
        health_docs = doc.get("health", [])
        tracking_days, completion_rate, streak = _compute_rates(health_docs)
        latest = health_docs[0] if health_docs else None
        items.append(
            {
                "anonymized_id": doc["anonymizedId"],
                "status": doc.get("status", AccountStatus.ACTIVE.value),
                "created_at": as_utc(doc.get("createdAt")),
                "last_active_at": as_utc(latest.get("updatedAt")) if latest else None,
                "latest": _latest_public(latest),
                "streak": streak,
                "tracking_days": tracking_days,
                "completion_rate_7d": completion_rate,
            }
        )

    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "pages": pages,
    }


@router.get(
    "/users/{anonymized_id}",
    response_model=AdminUserDetail,
    summary="Anonymized user detail & history",
)
async def get_user_detail(
    anonymized_id: str,
    _: CurrentAdmin,
    days: int = Query(default=7, ge=1, le=90),
) -> dict:
    user = await users.find_one(
        {"anonymizedId": anonymized_id, "role": UserRole.USER.value}
    )
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Anonymized user not found")

    all_docs = await health_data.find(
        {"anonymizedId": anonymized_id}, {"date": 1, "workoutCompleted": 1}
    ).to_list(length=None)
    completed_dates = {d["date"] for d in all_docs if d.get("workoutCompleted")}
    last_week = set(last_n_dates(7))
    rate_7d = _rate(len(completed_dates & last_week), 7)

    dates = last_n_dates(days)
    docs = await health_data.find(
        {"anonymizedId": anonymized_id, "date": {"$in": dates}}
    ).to_list(length=None)
    by_date = {d["date"]: d for d in docs}

    history = [
        health_day(
            by_date.get(day)
            or {
                "date": day,
                "waterGlasses": 0,
                "screenTimeHours": None,
                "mostUsedApp": None,
                "sleepHours": None,
                "workoutCompleted": False,
                "completedExercises": [],
                "planId": None,
                "updatedAt": None,
            }
        )
        for day in dates
    ]

    return {
        "anonymized_id": anonymized_id,
        "status": user.get("status", AccountStatus.ACTIVE.value),
        "created_at": as_utc(user.get("createdAt")),
        "streak": calculate_streak(completed_dates),
        "tracking_days": len(all_docs),
        "completion_rate_7d": rate_7d,
        "history": history,
    }


# ---------------------------------------------------------------------------
# Lifecycle actions
# ---------------------------------------------------------------------------
@router.patch(
    "/users/{anonymized_id}/status",
    response_model=AdminActionResponse,
    summary="Suspend or reactivate an anonymized user",
)
async def update_user_status(
    anonymized_id: str,
    payload: StatusUpdate,
    admin: CurrentAdmin,
) -> dict:
    user = await users.find_one(
        {"anonymizedId": anonymized_id, "role": UserRole.USER.value}
    )
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Anonymized user not found")

    if user.get("status") == AccountStatus.DELETED:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This account has been soft-deleted and cannot be reactivated",
        )

    now = utcnow()
    update: dict = {"status": payload.status, "updatedAt": now}
    if payload.status == AccountStatus.ACTIVE.value:
        update.update({"failedLoginAttempts": 0, "lockedUntil": None})

    await users.update_one({"_id": user["_id"]}, {"$set": update})

    # Suspension immediately invalidates all refresh tokens. Access tokens are
    # also rejected by get_current_user because status is re-read per request.
    if payload.status == AccountStatus.SUSPENDED.value:
        await revoke_all_refresh_tokens(user["_id"])

    action = (
        "user.suspend"
        if payload.status == AccountStatus.SUSPENDED.value
        else "user.reactivate"
    )
    await record_audit(
        actor_anonymized_id=admin["anonymizedId"],
        action=action,
        target_anonymized_id=anonymized_id,
        metadata={"previousStatus": user.get("status")},
    )
    await log_event(
        level="warning" if action == "user.suspend" else "info",
        category="admin",
        event=action,
        message=(
            "Administrator suspended an account"
            if action == "user.suspend"
            else "Administrator reactivated an account"
        ),
        actor_anonymized_id=admin["anonymizedId"],
        metadata={"target": anonymized_id, "previousStatus": user.get("status")},
    )

    return {
        "message": (
            "User suspended and all sessions revoked"
            if action == "user.suspend"
            else "User reactivated"
        ),
        "anonymized_id": anonymized_id,
        "status": payload.status,
    }


@router.delete(
    "/users/{anonymized_id}",
    response_model=AdminActionResponse,
    summary="Soft-delete an anonymized user",
)
async def soft_delete_user(anonymized_id: str, admin: CurrentAdmin) -> dict:
    user = await users.find_one(
        {"anonymizedId": anonymized_id, "role": UserRole.USER.value}
    )
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Anonymized user not found")
    if user.get("status") == AccountStatus.DELETED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Account is already deleted")

    now = utcnow()
    await users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "status": AccountStatus.DELETED.value,
                "deletedAt": now,
                "updatedAt": now,
            }
        },
    )
    await revoke_all_refresh_tokens(user["_id"])

    await record_audit(
        actor_anonymized_id=admin["anonymizedId"],
        action="user.soft_delete",
        target_anonymized_id=anonymized_id,
        metadata={"previousStatus": user.get("status")},
    )
    await log_event(
        level="warning",
        category="admin",
        event="user.soft_delete",
        message="Administrator soft-deleted an account",
        actor_anonymized_id=admin["anonymizedId"],
        metadata={"target": anonymized_id, "previousStatus": user.get("status")},
    )

    return {
        "message": "User soft-deleted. Anonymized health history is retained.",
        "anonymized_id": anonymized_id,
        "status": AccountStatus.DELETED.value,
    }


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------
@router.get("/audit-logs", response_model=AuditPage, summary="Admin action audit log")
async def list_audit_logs(
    _: CurrentAdmin,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=MAX_PAGE_SIZE),
    action: str | None = Query(default=None, max_length=50),
) -> dict:
    query: dict = {}
    if action:
        query["action"] = action

    total = await audit_logs.count_documents(query)
    pages = math.ceil(total / limit) if total else 0
    cursor = (
        audit_logs.find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    items = []
    async for doc in cursor:
        items.append(
            {
                "id": str(doc["_id"]),
                "actor_anonymized_id": doc.get("actorAnonymizedId", "system"),
                "action": doc.get("action", "unknown"),
                "target_anonymized_id": doc.get("targetAnonymizedId"),
                "metadata": doc.get("metadata", {}),
                "created_at": as_utc(doc.get("createdAt")),
            }
        )

    return {"items": items, "page": page, "limit": limit, "total": total, "pages": pages}


# ---------------------------------------------------------------------------
# System log table
# ---------------------------------------------------------------------------
def _log_public(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "level": doc.get("level", "info"),
        "category": doc.get("category", "system"),
        "event": doc.get("event", "unknown"),
        "message": doc.get("message", ""),
        "actor_anonymized_id": doc.get("actorAnonymizedId"),
        "identifier_fingerprint": doc.get("identifierFingerprint"),
        "metadata": doc.get("metadata", {}),
        "created_at": as_utc(doc.get("createdAt")),
    }


@router.get("/logs/stats", response_model=SystemLogStats, summary="System log summary")
async def get_log_stats(_: CurrentAdmin) -> dict:
    since = utcnow() - timedelta(hours=24)

    total = await system_logs.count_documents({})
    last_24h = await system_logs.count_documents({"createdAt": {"$gte": since}})
    warnings_24h = await system_logs.count_documents(
        {"level": "warning", "createdAt": {"$gte": since}}
    )
    errors_24h = await system_logs.count_documents(
        {"level": {"$in": ["error", "critical"]}, "createdAt": {"$gte": since}}
    )
    security_events_24h = await system_logs.count_documents(
        {"category": "security", "createdAt": {"$gte": since}}
    )

    by_level = [
        {"level": row["_id"] or "info", "count": int(row["count"])}
        async for row in system_logs.aggregate(
            [
                {"$group": {"_id": "$level", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
            ]
        )
    ]

    top_events = [
        {"event": row["_id"] or "unknown", "count": int(row["count"])}
        async for row in system_logs.aggregate(
            [
                {"$group": {"_id": "$event", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 5},
            ]
        )
    ]

    return {
        "total": total,
        "last_24h": last_24h,
        "warnings_24h": warnings_24h,
        "errors_24h": errors_24h,
        "security_events_24h": security_events_24h,
        "by_level": by_level,
        "top_events": top_events,
        "generated_at": utcnow(),
    }


@router.get("/logs", response_model=SystemLogPage, summary="Browse the system log table")
async def list_system_logs(
    _: CurrentAdmin,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=MAX_PAGE_SIZE),
    level: Literal["all", "debug", "info", "warning", "error", "critical"] = Query(
        default="all"
    ),
    category: Literal["all", "auth", "security", "admin", "data", "system"] = Query(
        default="all"
    ),
    search: str | None = Query(default=None, max_length=60),
    only_warnings: bool = Query(default=False),
) -> dict:
    query: dict = {}
    if level != "all":
        query["level"] = level
    if only_warnings:
        query["level"] = {"$in": ["warning", "error", "critical"]}
    if category != "all":
        query["category"] = category
    if search:
        pattern = {"$regex": re.escape(search.strip()), "$options": "i"}
        query["$or"] = [
            {"event": pattern},
            {"message": pattern},
            {"actorAnonymizedId": pattern},
            {"identifierFingerprint": pattern},
        ]

    total = await system_logs.count_documents(query)
    pages = math.ceil(total / limit) if total else 0
    cursor = (
        system_logs.find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    items = [_log_public(doc) async for doc in cursor]
    return {"items": items, "page": page, "limit": limit, "total": total, "pages": pages}


# ---------------------------------------------------------------------------
# Log backup: download the table as a .log file, then reset it
# ---------------------------------------------------------------------------
def _backup_line(doc: dict) -> str:
    """Render one `system_logs` document like the rotating file sink does."""
    created = as_utc(doc.get("createdAt"))
    stamp = created.strftime("%Y-%m-%d %H:%M:%S") if created else "1970-01-01 00:00:00"
    level = str(doc.get("level", "info")).upper()
    suffix = ""
    if doc.get("actorAnonymizedId"):
        suffix += f" | actor={doc['actorAnonymizedId']}"
    if doc.get("identifierFingerprint"):
        suffix += f" | fp={doc['identifierFingerprint']}"
    return (
        f"{stamp} | {level:<8} | {doc.get('category', 'system')} | "
        f"{doc.get('event', 'unknown')} | {doc.get('message', '')}{suffix}"
    )


@router.post(
    "/logs/backup",
    summary="Download the system log as a .log file and reset the table",
)
async def backup_system_logs(admin: CurrentAdmin) -> Response:
    """Export every stored event to a downloadable log file, then clear them.

    The admin receives a plain-text backup of everything currently in the
    ``system_logs`` collection of the cloud database. Those rows are deleted
    immediately after the file is produced, so logging restarts from an empty
    table; events written after this moment are kept.
    """
    cutoff = utcnow()
    docs = [
        doc
        async for doc in system_logs.find({"createdAt": {"$lte": cutoff}}).sort("createdAt", 1)
    ]

    stamp = cutoff.strftime("%Y%m%d-%H%M%S")
    filename = f"anonfit-system-logs-{stamp}.log"

    first = as_utc(docs[0].get("createdAt")) if docs else None
    last = as_utc(docs[-1].get("createdAt")) if docs else None

    header = [
        "# AnonFit system log backup",
        f"# exported_at: {cutoff.isoformat()}Z",
        f"# events: {len(docs)}",
        f"# range: {first.isoformat() if first else '-'} .. {last.isoformat() if last else '-'}",
        "# source: MongoDB collection 'system_logs'",
        "# note: these rows were purged from the database after this download;",
        "#       a fresh log window started immediately afterwards.",
        "",
    ]
    payload = "\n".join(header + [_backup_line(doc) for doc in docs]) + (
        "\n" if docs else ""
    )

    # Purge only what was exported: everything stamped at or before the cutoff.
    removed = (
        await system_logs.delete_many({"createdAt": {"$lte": cutoff}})
    ).deleted_count

    await record_audit(
        actor_anonymized_id=admin["anonymizedId"],
        action="logs.backup",
        metadata={"exported": len(docs), "removed": removed, "file": filename},
    )
    # Written after the purge so the event survives as the first row of the
    # new log window.
    await log_event(
        level="info",
        category="admin",
        event="logs.backup",
        message=(
            "Administrator downloaded the system log backup and reset the table "
            f"({len(docs)} event(s) exported, {removed} purged)"
        ),
        actor_anonymized_id=admin["anonymizedId"],
        metadata={"exported": len(docs), "removed": removed, "file": filename},
    )

    return Response(
        content=payload,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Log-Export-Count": str(len(docs)),
            "X-Log-Removed-Count": str(removed),
            "Cache-Control": "no-store",
        },
    )
