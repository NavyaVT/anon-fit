"""Seed four demo member accounts with realistic wellness history.

Usage:
    cd backend
    python -m app.utils.seed_users            # create or refresh the demo members
    python -m app.utils.seed_users --keep-data  # only fix credentials / status

What it does
------------
* Creates four ``role=user`` accounts with permanent anonymized IDs.
* Gives each one a YouTube workout plan and 14 days of ``health_data``
  (water, screen time, most-used app, sleep, checklist progress).
* Writes a ``system.seed_users`` entry to the application log.

Safe to re-run: an existing demo account keeps its anonymized ID; its password,
lock state and demo health history are reset. No other account is touched.

Privacy note
------------
Only email addresses are stored in ``users`` — the display names below exist in
this script for console output and to label the demo data. Health documents
reference the anonymized ID exclusively.
"""

import argparse
import asyncio
import random
import sys

from pymongo.errors import DuplicateKeyError

from app.auth.security import hash_password
from app.database import close_db, health_data, init_db, users, workout_plans
from app.models.user import AccountStatus, UserRole
from app.utils.dates import last_n_dates, utcnow
from app.utils.ids import generate_anonymized_id
from app.utils.logging_store import configure_logging, log_event

DEMO_PASSWORD = "UserPass123"
HISTORY_DAYS = 14

# ---------------------------------------------------------------------------
# Demo profiles
# ---------------------------------------------------------------------------
DEMO_USERS: list[dict] = [
    {
        "name": "Maya Chen",
        "email": "maya.chen@anonfit.app",
        "plan": {
            "title": "Morning Mobility Flow",
            "youtubeUrl": "https://www.youtube.com/watch?v=UItWltVZZmE",
            "videoId": "UItWltVZZmE",
            "exercises": [
                ("Neck & shoulder release", 45),
                ("Cat-cow flow", 250),
                ("World's greatest stretch", 570),
                ("Deep hip opener", 920),
                ("Closing breathing practice", 1320),
            ],
        },
        "water": (7, 9),
        "screen": (1.4, 2.6),
        "sleep": (7.2, 8.2),
        "apps": ["Headspace", "Spotify"],
        # Consecutive completed days ending today.
        "streak": 6,
        "seed": 11,
    },
    {
        "name": "Liam Ortiz",
        "email": "liam.ortiz@anonfit.app",
        "plan": {
            "title": "Full Body Strength",
            "youtubeUrl": "https://www.youtube.com/watch?v=oAPCPjnU1wA",
            "videoId": "oAPCPjnU1wA",
            "exercises": [
                ("Dynamic warm-up", 60),
                ("Goblet squat block", 375),
                ("Push-up ladder", 760),
                ("Single-leg hinge", 1145),
                ("Core finisher", 1590),
            ],
        },
        "water": (5, 7),
        "screen": (2.8, 4.2),
        "sleep": (6.4, 7.4),
        "apps": ["Instagram", "YouTube"],
        "streak": 3,
        "seed": 23,
    },
    {
        "name": "Sofia Haddad",
        "email": "sofia.haddad@anonfit.app",
        "plan": {
            "title": "Low-Impact Cardio",
            "youtubeUrl": "https://www.youtube.com/watch?v=ml6cT4AZdqI",
            "videoId": "ml6cT4AZdqI",
            "exercises": [
                ("March in place", 30),
                ("Step-touch combo", 300),
                ("Standing knee drives", 645),
                ("Cool-down walk", 980),
            ],
        },
        "water": (3, 5),
        "screen": (5.5, 7.2),
        "sleep": (5.2, 6.3),
        "apps": ["TikTok", "Netflix"],
        "streak": 0,
        "seed": 37,
    },
    {
        "name": "Noah Weber",
        "email": "noah.weber@anonfit.app",
        "plan": {
            "title": "HIIT Sweat Session",
            "youtubeUrl": "https://www.youtube.com/watch?v=UItWltVZZmE",
            "videoId": "UItWltVZZmE",
            "exercises": [
                ("Mobility primer", 20),
                ("Burpee intervals", 215),
                ("Mountain climbers", 470),
                ("Jump squat rounds", 735),
                ("Plank hold series", 1060),
                ("Stretch & breathe", 1380),
            ],
        },
        "water": (6, 8),
        "screen": (2.2, 3.8),
        "sleep": (6.8, 7.9),
        "apps": ["Strava", "Spotify"],
        "streak": 11,
        "seed": 59,
    },
]


def _health_rows(profile: dict, plan_id, rng: random.Random) -> list[dict]:
    """Build 14 days of history with a realistic streak and a few rest days."""
    now = utcnow()
    dates = last_n_dates(HISTORY_DAYS)  # oldest → today
    streak = int(profile["streak"])
    exercise_indexes = list(range(len(profile["plan"]["exercises"])))

    rows = []
    for offset, day in enumerate(dates):
        days_ago = len(dates) - 1 - offset

        # The most recent `streak` days are completed workouts, including today
        # when the profile has an active streak.
        completed = days_ago < streak
        rest_day = not completed and days_ago % 4 == 3

        water_low, water_high = profile["water"]
        screen_low, screen_high = profile["screen"]
        sleep_low, sleep_high = profile["sleep"]

        screen_hours = round(rng.uniform(screen_low, screen_high), 1)
        if rest_day:
            screen_hours = round(min(screen_high + 1.6, 9.5), 1)

        completed_indexes = exercise_indexes if completed else []
        if not completed and not rest_day and days_ago % 3 == 0:
            # A day where the member started the checklist but stopped early.
            completed_indexes = exercise_indexes[: max(1, len(exercise_indexes) // 2)]

        row = {
            "anonymizedId": None,  # filled by the caller
            "date": day,
            "waterGlasses": rng.randint(water_low, water_high) if not rest_day else water_low,
            "screenTimeHours": None if days_ago % 9 == 5 else screen_hours,
            "mostUsedApp": (
                None if days_ago % 9 == 5 else rng.choice(profile["apps"])
            ),
            "sleepHours": (
                None if days_ago % 11 == 7 else round(rng.uniform(sleep_low, sleep_high), 1)
            ),
            "planId": plan_id if completed_indexes else None,
            "completedExercises": completed_indexes,
            "workoutCompleted": completed,
            "createdAt": now,
            "updatedAt": now,
        }
        rows.append(row)
    return rows


async def _upsert_user(profile: dict, password_hash: str, keep_data: bool) -> tuple[dict, bool]:
    """Create or refresh a demo account. Returns (user doc, created)."""
    now = utcnow()
    existing = await users.find_one({"email": profile["email"]})

    if existing:
        if existing.get("role") != UserRole.USER.value:
            print(
                f"  ! {profile['email']} belongs to an administrator — skipped.",
            )
            return existing, False

        await users.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "passwordHash": password_hash,
                    "status": AccountStatus.ACTIVE.value,
                    "failedLoginAttempts": 0,
                    "lockedUntil": None,
                    "updatedAt": now,
                }
            },
        )
        if not keep_data:
            await health_data.delete_many({"anonymizedId": existing["anonymizedId"]})
            await workout_plans.delete_many({"anonymizedId": existing["anonymizedId"]})
        return existing, False

    anonymized_id = generate_anonymized_id()
    for _ in range(5):
        if not await users.find_one({"anonymizedId": anonymized_id}):
            break
        anonymized_id = generate_anonymized_id()

    doc = {
        "email": profile["email"],
        "passwordHash": password_hash,
        "role": UserRole.USER.value,
        "status": AccountStatus.ACTIVE.value,
        "anonymizedId": anonymized_id,
        "biometricEnabled": False,
        "failedLoginAttempts": 0,
        "lockedUntil": None,
        "createdAt": now,
        "updatedAt": now,
        "lastLoginAt": None,
        "deletedAt": None,
    }
    try:
        result = await users.insert_one(doc)
    except DuplicateKeyError:
        print(f"  ! {profile['email']} already exists — skipped.")
        return await users.find_one({"email": profile["email"]}), False

    doc["_id"] = result.inserted_id
    return doc, True


async def seed(keep_data: bool = False) -> int:
    await init_db()
    created = 0
    password_hash = hash_password(DEMO_PASSWORD)
    now = utcnow()

    try:
        print("\nSeeding demo members...\n")
        for profile in DEMO_USERS:
            user, was_created = await _upsert_user(profile, password_hash, keep_data)
            if not user or user.get("role") != UserRole.USER.value:
                continue
            created += 1 if was_created else 0

            anon_id = user["anonymizedId"]
            plan_doc = await workout_plans.find_one({"anonymizedId": anon_id})
            if plan_doc is None:
                plan_doc = {
                    "anonymizedId": anon_id,
                    "title": profile["plan"]["title"],
                    "youtubeUrl": profile["plan"]["youtubeUrl"],
                    "videoId": profile["plan"]["videoId"],
                    "exercises": [
                        {"name": name, "startSeconds": start}
                        for name, start in profile["plan"]["exercises"]
                    ],
                    "createdAt": now,
                    "updatedAt": now,
                }
                result = await workout_plans.insert_one(plan_doc)
                plan_doc["_id"] = result.inserted_id

            if not keep_data:
                rng = random.Random(profile["seed"])
                rows = _health_rows(profile, plan_doc["_id"], rng)
                for row in rows:
                    row["anonymizedId"] = anon_id
                if rows:
                    await health_data.insert_many(rows)

            status = "created" if was_created else "refreshed"
            print(
                f"  - {profile['name']:<14} {profile['email']:<28} "
                f"{anon_id}  [{status}]"
            )

        await log_event(
            level="info",
            category="system",
            event="system.seed_users",
            message=f"Demo member seed completed ({len(DEMO_USERS)} profiles)",
            metadata={"profiles": len(DEMO_USERS), "keepData": keep_data},
        )

        print("\nAll demo members share the password:", DEMO_PASSWORD)
        print("Sign in at http://localhost:5173/login\n")
        return created
    finally:
        await close_db()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed four AnonFit demo members.")
    parser.add_argument(
        "--keep-data",
        action="store_true",
        help="Keep existing health history and workout plans",
    )
    args = parser.parse_args()

    configure_logging()
    try:
        asyncio.run(seed(keep_data=args.keep_data))
    except KeyboardInterrupt:
        sys.exit(130)


if __name__ == "__main__":
    main()
