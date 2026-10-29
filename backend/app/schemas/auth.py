"""Authentication request / response schemas."""

from pydantic import EmailStr, Field, field_validator

from app.schemas.base import CamelModel
from app.schemas.user import UserPublic
from app.utils.validation import validate_password_strength


class RegisterRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_policy(cls, value: str) -> str:
        return validate_password_strength(value)


class LoginRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(CamelModel):
    refresh_token: str = Field(min_length=10)


class LogoutRequest(CamelModel):
    refresh_token: str | None = None
    all_devices: bool = False


class ChangePasswordRequest(CamelModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_policy(cls, value: str) -> str:
        return validate_password_strength(value)


class TokenPair(CamelModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # access token lifetime in seconds


class AuthResponse(TokenPair):
    user: UserPublic


class ChangePasswordResponse(CamelModel):
    message: str
    user: UserPublic
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
