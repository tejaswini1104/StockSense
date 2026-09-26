"""ORM models. Imported here so Alembic autogenerate discovers every table."""

from app.models.otp import PasswordResetOTP
from app.models.user import User, UserRole

__all__ = ["PasswordResetOTP", "User", "UserRole"]
