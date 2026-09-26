"""Password-reset OTP issuing and verification.

Rules enforced here:
  * a new OTP invalidates any previous outstanding OTP for that user
  * an OTP expires after ``settings.OTP_EXPIRE_MINUTES``
  * an OTP can be redeemed exactly once (``consumed_at``)
  * repeated wrong guesses burn the OTP after ``settings.OTP_MAX_ATTEMPTS``
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_otp_code, hash_otp_code, verify_otp_code
from app.models.otp import PasswordResetOTP
from app.models.user import User
from app.services.mailer import send_password_reset_otp

logger = logging.getLogger("stocksense.otp")


class OTPError(Exception):
    """Raised when an OTP cannot be verified."""


def _invalidate_outstanding(db: Session, user_id: int) -> None:
    """Consume every still-usable OTP for the user."""
    now = datetime.now(timezone.utc)
    outstanding = db.scalars(
        select(PasswordResetOTP).where(
            PasswordResetOTP.user_id == user_id,
            PasswordResetOTP.consumed_at.is_(None),
        )
    ).all()
    for otp in outstanding:
        otp.consumed_at = now


def issue_otp(db: Session, user: User) -> PasswordResetOTP:
    """Create, persist and email a fresh OTP for the user."""
    _invalidate_outstanding(db, user.id)

    code = generate_otp_code()
    otp = PasswordResetOTP(
        user_id=user.id,
        code_hash=hash_otp_code(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    )
    db.add(otp)
    db.commit()
    db.refresh(otp)

    send_password_reset_otp(
        to=user.email,
        name=user.name,
        code=code,
        expires_minutes=settings.OTP_EXPIRE_MINUTES,
    )
    # Mirrored to the log so the flow is demoable without SMTP credentials.
    logger.info("Issued password reset OTP for %s: %s", user.email, code)
    return otp


def _latest_otp(db: Session, user_id: int) -> PasswordResetOTP | None:
    return db.scalars(
        select(PasswordResetOTP)
        .where(PasswordResetOTP.user_id == user_id)
        .order_by(PasswordResetOTP.created_at.desc(), PasswordResetOTP.id.desc())
        .limit(1)
    ).first()


def verify_otp(db: Session, user: User, code: str, *, consume: bool) -> PasswordResetOTP:
    """Validate a submitted OTP.

    ``consume=False`` only checks the code (used by the "verify code" step);
    ``consume=True`` marks it used so it can never be replayed.
    """
    otp = _latest_otp(db, user.id)
    if otp is None:
        raise OTPError("No reset code has been requested for this account.")
    if otp.is_consumed:
        raise OTPError("This code has already been used. Please request a new one.")
    if otp.is_expired:
        raise OTPError("This code has expired. Please request a new one.")
    if otp.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp.consumed_at = datetime.now(timezone.utc)
        db.commit()
        raise OTPError("Too many incorrect attempts. Please request a new code.")

    if not verify_otp_code(code, otp.code_hash):
        otp.attempts += 1
        remaining = max(settings.OTP_MAX_ATTEMPTS - otp.attempts, 0)
        if remaining == 0:
            otp.consumed_at = datetime.now(timezone.utc)
            db.commit()
            raise OTPError("Too many incorrect attempts. Please request a new code.")
        db.commit()
        raise OTPError(f"Incorrect code. {remaining} attempt(s) remaining.")

    if consume:
        otp.consumed_at = datetime.now(timezone.utc)
    db.commit()
    return otp
