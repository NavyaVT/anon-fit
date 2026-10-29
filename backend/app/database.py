"""Async MongoDB connection and collection helpers.

Privacy architecture
--------------------
Two collections intentionally live side by side and are never joined in a
user-facing health response:

* ``users``        → real identity (email, password hash, role, status)
* ``health_data``  → ``anonymizedId`` + health metrics ONLY

``system_logs`` mirrors the rotating file log (``backend/logs/anonfit.log``) so
administrators can query events without shell access to the server.

Admin routes aggregate health data by ``anonymizedId`` and resolve identifiers
to user ids only internally (e.g. to revoke sessions on suspension).
"""

import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# A single client is shared for the lifetime of the process.
client: AsyncIOMotorClient = AsyncIOMotorClient(
    settings.mongodb_url,
    serverSelectionTimeoutMS=5000,
    uuidRepresentation="standard",
)
db: AsyncIOMotorDatabase = client[settings.mongodb_db]

# Collections
users = db.get_collection("users")
health_data = db.get_collection("health_data")
workout_plans = db.get_collection("workout_plans")
refresh_tokens = db.get_collection("refresh_tokens")
audit_logs = db.get_collection("audit_logs")
system_logs = db.get_collection("system_logs")
webauthn_credentials = db.get_collection("webauthn_credentials")
webauthn_challenges = db.get_collection("webauthn_challenges")


def _cluster_label(url: str) -> str:
    """Host of a MongoDB URI for log lines — never the credentials."""
    try:
        return url.rsplit("@", 1)[1].split("/", 1)[0]
    except IndexError:
        return "(unparseable uri)"


async def init_db() -> None:
    """Ping MongoDB and create the indexes the API relies on."""
    await client.admin.command("ping")
    await users.create_index("email", unique=True, name="uniq_email")
    await users.create_index("anonymizedId", unique=True, name="uniq_anonymized_id")

    await health_data.create_index(
        [("anonymizedId", 1), ("date", 1)], unique=True, name="uniq_anon_date"
    )
    await health_data.create_index(
        [("anonymizedId", 1), ("date", -1)], name="anon_date_desc"
    )
    await health_data.create_index("date", name="date")

    await workout_plans.create_index(
        [("anonymizedId", 1), ("createdAt", -1)], name="anon_created"
    )

    # Refresh tokens are rotated on every use. The TTL index removes expired
    # rows automatically; `jti` is unique so a token can be used only once.
    await refresh_tokens.create_index("jti", unique=True, name="uniq_jti")
    await refresh_tokens.create_index("expiresAt", expireAfterSeconds=0, name="ttl_expiry")
    await refresh_tokens.create_index([("userId", 1), ("revoked", 1)], name="user_revoked")

    await audit_logs.create_index([("createdAt", -1)], name="created_desc")
    await system_logs.create_index([("createdAt", -1)], name="log_created_desc")
    await system_logs.create_index([("level", 1), ("createdAt", -1)], name="log_level_created")
    await system_logs.create_index([("category", 1), ("createdAt", -1)], name="log_category_created")
    await system_logs.create_index([("event", 1), ("createdAt", -1)], name="log_event_created")

    # Passkeys: one row per enrolled authenticator. The private key never leaves
    # the device, so only the public key and a signature counter are stored.
    await webauthn_credentials.create_index(
        "credentialId", unique=True, name="uniq_credential_id"
    )
    await webauthn_credentials.create_index(
        [("userId", 1), ("createdAt", 1)], name="user_created"
    )
    # Ceremony challenges are single-use and expire after a few minutes.
    await webauthn_challenges.create_index("challenge", unique=True, name="uniq_challenge")
    await webauthn_challenges.create_index(
        "expiresAt", expireAfterSeconds=0, name="ttl_challenge"
    )

    logger.info("MongoDB connected - cluster '%s' - database '%s'", _cluster_label(settings.mongodb_url), settings.mongodb_db)


async def close_db() -> None:
    client.close()
    logger.info("MongoDB connection closed")
