"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.services import auth_service

bearer_scheme = HTTPBearer(auto_error=False, description="JWT access token")

DbSession = Annotated[Session, Depends(get_db)]
Credentials = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)]

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(db: DbSession, credentials: Credentials) -> User:
    """Resolve the authenticated user from the Authorization header."""
    if credentials is None or not credentials.credentials:
        raise _UNAUTHORIZED

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise _UNAUTHORIZED

    subject = payload.get("sub")
    if subject is None or not str(subject).isdigit():
        raise _UNAUTHORIZED

    user = auth_service.get_user_by_id(db, int(subject))
    if user is None:
        raise _UNAUTHORIZED
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole):
    """Dependency factory restricting a route to the given roles."""

    def _checker(current_user: CurrentUser) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return _checker
