"""FastAPI dependencies for authentication and role checks."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.auth.jwt import TokenError, decode_token
from app.config import get_settings
from app.database import users
from app.models.user import AccountStatus, UserRole
from app.utils.serializers import object_id

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.api_prefix}/auth/login",
    auto_error=False,
)

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
) -> dict:
    """Resolve the authenticated, active user from a Bearer access token."""
    if not token:
        raise CREDENTIALS_EXCEPTION

    try:
        payload = decode_token(token, expected_type="access")
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_id = object_id(str(payload.get("sub", "")))
    if user_id is None:
        raise CREDENTIALS_EXCEPTION

    user = await users.find_one({"_id": user_id})
    if user is None:
        raise CREDENTIALS_EXCEPTION

    account_status = user.get("status")
    if account_status == AccountStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Contact an administrator.",
        )
    if account_status == AccountStatus.DELETED:
        raise CREDENTIALS_EXCEPTION

    return user


async def require_user(current_user: Annotated[dict, Depends(get_current_user)]) -> dict:
    """Require a standard user account."""
    if current_user.get("role") != UserRole.USER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for user accounts only",
        )
    return current_user


async def require_admin(current_user: Annotated[dict, Depends(get_current_user)]) -> dict:
    """Require an administrator. Role is re-checked against the database."""
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current_user


CurrentUser = Annotated[dict, Depends(get_current_user)]
CurrentUserOnly = Annotated[dict, Depends(require_user)]
CurrentAdmin = Annotated[dict, Depends(require_admin)]
