"""Dual-sink application logging: rotating file **and** a MongoDB table.

Every call to :func:`log_event` writes to two places:

* ``backend/logs/anonfit.log`` — a rotating file (5 MB × 5 backups) owned by the
  standard :mod:`logging` stack, so the trail survives a database outage and can
  be shipped to any log collector. Uvicorn's *access* records are intentionally
  excluded because they carry client IP addresses.
* ``system_logs`` — a MongoDB collection the admin console can browse, filter
  and paginate.

Privacy rules for this module
-----------------------------
Callers must never pass an email, name or password. When an event references an
account we store its permanent ``anonymizedId``. A failed sign-in against an
*unknown* email stores a short SHA-256 fingerprint instead, which lets an
operator correlate repeated attempts without turning logs into a second PII
store.
"""

import hashlib
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from app.database import system_logs
from app.utils.dates import utcnow

# backend/app/utils/logging_store.py → backend/
LOG_DIR = Path(__file__).resolve().parents[2] / "logs"
LOG_FILE = LOG_DIR / "anonfit.log"

MAX_BYTES = 5 * 1024 * 1024
BACKUP_COUNT = 5

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"

_LEVELS: dict[str, int] = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warning": logging.WARNING,
    "error": logging.ERROR,
    "critical": logging.CRITICAL,
}

_configured = False
_file_handler: RotatingFileHandler | None = None


def configure_logging(level: str = "INFO") -> Path:
    """Attach a rotating file handler to the root logger and uvicorn loggers.

    Idempotent: calling it twice (e.g. ``--reload``) will not duplicate lines.
    """
    global _configured, _file_handler

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    numeric_level = _LEVELS.get(level.lower(), logging.INFO)

    if _configured:
        return LOG_FILE

    logging.basicConfig(level=numeric_level, format=LOG_FORMAT)

    handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    handler.setFormatter(logging.Formatter(LOG_FORMAT))

    root = logging.getLogger()
    root.setLevel(numeric_level)
    root.addHandler(handler)

    # Uvicorn installs its own handlers and does not propagate to root. Attach only
    # to the parent `uvicorn` logger: `uvicorn.error` is a *child* of it and would
    # otherwise write every line twice. `uvicorn.access` is skipped deliberately —
    # access records contain client IP addresses, and this project keeps every sink
    # free of network identifiers.
    uvicorn_logger = logging.getLogger("uvicorn")
    if not any(isinstance(h, RotatingFileHandler) for h in uvicorn_logger.handlers):
        uvicorn_logger.addHandler(handler)

    _file_handler = handler
    _configured = True
    return LOG_FILE


def fingerprint(value: str) -> str:
    """Short, non-reversible identifier used for unknown sign-in attempts."""
    digest = hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()
    return f"fp_{digest[:12]}"


async def log_event(
    *,
    level: str,
    category: str,
    event: str,
    message: str,
    actor_anonymized_id: str | None = None,
    identifier_fingerprint: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Write one structured event to the file sink and the database table.

    Never raises: a logging failure must not break the request that produced it.
    """
    level = level.lower() if level.lower() in _LEVELS else "info"
    event_logger = logging.getLogger("anonfit.events")

    suffix = f" | actor={actor_anonymized_id}" if actor_anonymized_id else ""
    if identifier_fingerprint:
        suffix += f" | fp={identifier_fingerprint}"
    event_logger.log(
        _LEVELS[level],
        "%s | %s | %s%s",
        category,
        event,
        message,
        suffix,
    )

    try:
        await system_logs.insert_one(
            {
                "level": level,
                "category": category,
                "event": event,
                "message": message,
                "actorAnonymizedId": actor_anonymized_id,
                "identifierFingerprint": identifier_fingerprint,
                "metadata": metadata or {},
                "createdAt": utcnow(),
            }
        )
    except Exception:  # pragma: no cover - defensive
        event_logger.warning("Could not persist log event '%s' to MongoDB", event)
