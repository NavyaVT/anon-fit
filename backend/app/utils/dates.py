"""Date / time helpers.

MongoDB stores datetimes as naive UTC. We use naive UTC values internally and
attach UTC tzinfo only when serializing API responses, so the browser can
render local time correctly.
"""

from datetime import date, datetime, timedelta, timezone


def utcnow() -> datetime:
    """Current UTC time as a naive datetime (Mongo-friendly)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def as_utc(value: datetime | None) -> datetime | None:
    """Attach UTC tzinfo to a naive database datetime."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def today_str() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def parse_iso_date(value: str) -> date:
    """Parse YYYY-MM-DD, raising ValueError for malformed input."""
    return date.fromisoformat(value)


def last_n_dates(days: int, end: date | None = None) -> list[str]:
    """Return the last `days` ISO dates in ascending order, ending today."""
    end_date = end or datetime.now(timezone.utc).date()
    return [(end_date - timedelta(days=offset)).isoformat() for offset in range(days - 1, -1, -1)]


def calculate_streak(completed_dates: set[str], today: date | None = None) -> int:
    """Count consecutive workout days ending today (or yesterday).

    A streak is not broken until a full day has been missed, so if today's
    workout is not done yet the streak from yesterday still counts.
    """
    current = today or datetime.now(timezone.utc).date()

    if current.isoformat() in completed_dates:
        cursor = current
    elif (current - timedelta(days=1)).isoformat() in completed_dates:
        cursor = current - timedelta(days=1)
    else:
        return 0

    streak = 0
    while cursor.isoformat() in completed_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak
