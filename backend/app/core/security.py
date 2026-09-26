"""Password hashing, OTP hashing and JWT helpers."""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# bcrypt silently truncates anything past 72 bytes, so reject longer inputs
# rather than accepting a password whose tail is ignored.
MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > MAX_PASSWORD_BYTES:
        raise ValueError("Password must be at most 72 bytes long.")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:MAX_PASSWORD_BYTES],
            hashed_password.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str | int, expires_minutes: int | None = None) -> str:
    """Issue a signed JWT access token for the given subject (user id)."""
    expire_delta = timedelta(
        minutes=expires_minutes
        if expires_minutes is not None
        else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int((now + expire_delta).timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode a JWT access token, returning None when it is invalid or expired."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
    if payload.get("type") != "access":
        return None
    return payload


def generate_otp_code(length: int | None = None) -> str:
    """Generate a cryptographically random numeric OTP."""
    digits = length or settings.OTP_LENGTH
    return "".join(str(secrets.randbelow(10)) for _ in range(digits))


def hash_otp_code(code: str) -> str:
    """Hash an OTP for storage. SHA-256 is enough for a short-lived random code."""
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def verify_otp_code(code: str, code_hash: str) -> bool:
    """Constant-time comparison of a submitted OTP against its stored hash."""
    return hmac.compare_digest(hash_otp_code(code), code_hash)
