"""Opaque identifier generation."""

import secrets


def generate_anonymized_id() -> str:
    """Return a permanent, non-guessable, non-identifying user id.

    Example: ``anon_7f3a9c2e``. Health records only ever reference this value.
    """
    return f"anon_{secrets.token_hex(4)}"


def generate_jti() -> str:
    """Identifier for a refresh token (rotation / revocation)."""
    return secrets.token_urlsafe(32)
