"""Create (or reset) the first administrator account.

Usage:
    cd backend
    python -m app.utils.seed_admin

Credentials are read from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD when set,
otherwise you are prompted. The admin receives a permanent ``anonymizedId``
exactly like every other account, so audit logs never expose an email.
"""

import asyncio
import getpass
import sys

from email_validator import EmailNotValidError, validate_email

from app.auth.security import hash_password
from app.config import get_settings
from app.database import close_db, init_db, users
from app.models.user import AccountStatus, UserRole
from app.utils.dates import utcnow
from app.utils.ids import generate_anonymized_id
from app.utils.validation import validate_password_strength

settings = get_settings()


def _prompt_email() -> str:
    raw = settings.seed_admin_email or input("Admin email: ").strip()
    try:
        return validate_email(raw, check_deliverability=False).normalized.lower()
    except EmailNotValidError as exc:
        print(f"Invalid email: {exc}")
        sys.exit(1)


def _prompt_password() -> str:
    password = settings.seed_admin_password or getpass.getpass("Admin password: ")
    if not settings.seed_admin_password:
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("Passwords do not match.")
            sys.exit(1)
    try:
        return validate_password_strength(password)
    except ValueError as exc:
        print(f"Weak password: {exc}")
        sys.exit(1)


async def seed() -> None:
    email = _prompt_email()
    password = _prompt_password()

    await init_db()
    try:
        existing = await users.find_one({"email": email})
        now = utcnow()

        if existing:
            if existing.get("role") != UserRole.ADMIN.value:
                print("This email belongs to a regular user. Choose another email.")
                sys.exit(1)

            await users.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "passwordHash": hash_password(password),
                        "role": UserRole.ADMIN.value,
                        "status": AccountStatus.ACTIVE.value,
                        "failedLoginAttempts": 0,
                        "lockedUntil": None,
                        "updatedAt": now,
                    }
                },
            )
            print("\nAdmin password reset successfully.")
            print(f"  Email:          {email}")
            print(f"  Anonymized id:  {existing['anonymizedId']}")
        else:
            anonymized_id = generate_anonymized_id()
            await users.insert_one(
                {
                    "email": email,
                    "passwordHash": hash_password(password),
                    "role": UserRole.ADMIN.value,
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
            )
            print("\nAdmin account created.")
            print(f"  Email:          {email}")
            print(f"  Anonymized id:  {anonymized_id}")

        print("\nSign in at /admin/login in the frontend.\n")
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(seed())
