"""Password hashing with bcrypt (via passlib)."""

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Used to equalize timing when an email does not exist, preventing user
# enumeration through response timing. Computed once at import time.
DUMMY_HASH = pwd_context.hash("anonfit-dummy-password-123")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(plain_password, password_hash)
    except (ValueError, TypeError):
        return False


def verify_dummy_password(plain_password: str) -> None:
    """Burn the same CPU time as a real verification, then discard."""
    verify_password(plain_password, DUMMY_HASH)
