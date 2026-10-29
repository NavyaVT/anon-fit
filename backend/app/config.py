"""Application settings loaded from environment variables / `.env`."""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "replace-with-a-long-random-secret-at-least-32-characters"


class Settings(BaseSettings):
    """Typed application configuration.

    Environment variables are case-insensitive, so `JWT_SECRET` maps to
    `jwt_secret`. Settings are cached via :func:`get_settings`.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # App
    app_name: str = "AnonFit API"
    environment: str = "development"
    api_prefix: str = "/api"
    log_level: str = "INFO"

    # Database
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "anonfit"

    # Auth
    jwt_secret: str = DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # CORS — comma separated string so it is easy to configure in .env
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # WebAuthn / passkeys (fingerprint, face or device PIN)
    webauthn_rp_name: str = "AnonFit"
    # Blank = derive from the browser's Origin header. A dev tunnel gets a new
    # hostname on every session, and a passkey is bound to the RP ID it was
    # created with, so deriving keeps the demo working without code changes.
    # Set this to your registrable domain in production.
    webauthn_rp_id: str = ""
    # Extra origins allowed to run a ceremony, on top of CORS_ORIGINS.
    webauthn_origins: str = ""

    # Seeding (only used by app.utils.seed_admin)
    seed_admin_email: str | None = None
    seed_admin_password: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def webauthn_origin_list(self) -> list[str]:
        """CORS origins plus any WebAuthn-specific ones, normalized and de-duplicated."""
        raw = f"{self.cors_origins},{self.webauthn_origins}"
        origins = [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]
        return list(dict.fromkeys(origins))

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    @field_validator("jwt_secret")
    @classmethod
    def validate_secret(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters long")
        return value


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
