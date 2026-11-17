from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import ACCESS, decode_token
from app.models import User

_bearer = HTTPBearer(auto_error=False)

SessionDep = Annotated[AsyncSession, Depends(get_session)]
Credentials = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


def ensure_can_sign_in(user: User) -> None:
    if user.is_banned:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your account has been banned.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is not active.")
    if not user.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Email is not verified.")


async def user_from_token(session: AsyncSession, token: str, token_type: str) -> User:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Your session is invalid or has expired. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token, token_type)
    if payload is None:
        raise unauthorized
    user = await session.get(User, int(payload["sub"]))
    if user is None or user.token_version != payload.get("tv"):
        raise unauthorized
    ensure_can_sign_in(user)
    return user


async def get_current_user(session: SessionDep, credentials: Credentials) -> User:
    if credentials is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Please sign in first.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await user_from_token(session, credentials.credentials, ACCESS)


async def get_optional_user(session: SessionDep, credentials: Credentials) -> User | None:
    """Ochiq sahifalar uchun: eskirgan token blogni o'qishga xalaqit bermasligi kerak."""
    if credentials is None:
        return None
    try:
        return await user_from_token(session, credentials.credentials, ACCESS)
    except HTTPException:
        return None


async def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access only.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
