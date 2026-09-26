"""Signup / login / password-reset business logic."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate


class EmailAlreadyRegistered(Exception):
    """Raised when a signup uses an email that already exists."""


class InvalidCredentials(Exception):
    """Raised when login fails."""


class InactiveAccount(Exception):
    """Raised when a deactivated user tries to authenticate."""


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalars(
        select(User).where(func.lower(User.email) == normalize_email(email))
    ).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def create_user(db: Session, payload: UserCreate) -> User:
    """Register a new user."""
    email = normalize_email(payload.email)
    if get_user_by_email(db, email) is not None:
        raise EmailAlreadyRegistered(email)

    user = User(
        name=payload.name.strip(),
        email=email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    """Return the user for valid credentials, or raise."""
    user = get_user_by_email(db, email)
    if user is None or not verify_password(password, user.hashed_password):
        # Same error for unknown email and wrong password: do not leak which
        # addresses are registered.
        raise InvalidCredentials
    if not user.is_active:
        raise InactiveAccount
    return user


def set_password(db: Session, user: User, new_password: str) -> User:
    user.hashed_password = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user
