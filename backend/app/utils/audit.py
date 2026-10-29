"""Audit-log writer for administrative actions."""

from app.database import audit_logs
from app.utils.dates import utcnow


async def record_audit(
    actor_anonymized_id: str,
    action: str,
    target_anonymized_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Append an immutable admin action entry.

    Only anonymized identifiers are stored, keeping the audit trail useful
    without turning it into another PII store.
    """
    await audit_logs.insert_one(
        {
            "actorAnonymizedId": actor_anonymized_id,
            "actorRole": "admin",
            "action": action,
            "targetAnonymizedId": target_anonymized_id,
            "metadata": metadata or {},
            "createdAt": utcnow(),
        }
    )
