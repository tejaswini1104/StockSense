"""One-time password used by the forgot-password flow."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class PasswordResetOTP(Base, TimestampMixin):
    """A hashed, single-use, expiring OTP tied to one user.

    The code itself is never stored -- only a SHA-256 hash of it, so a database
    leak cannot be replayed against the reset endpoint.
    """

    __tablename__ = "password_reset_otps"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped["User"] = relationship(back_populates="otps")  # noqa: F821

    @property
    def is_expired(self) -> bool:
        expires_at = self.expires_at
        if expires_at.tzinfo is None:  # SQLite returns naive datetimes
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) >= expires_at

    @property
    def is_consumed(self) -> bool:
        return self.consumed_at is not None

    @property
    def is_usable(self) -> bool:
        return not self.is_consumed and not self.is_expired
