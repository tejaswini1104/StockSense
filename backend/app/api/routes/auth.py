"""Authentication routes: signup, login, session, and password reset by OTP."""

import logging

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.core.security import create_access_token
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    VerifyOTPRequest,
)
from app.schemas.user import UserCreate, UserRead
from app.services import auth_service, otp_service

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("stocksense.auth")

# Returned for any forgot-password request so the endpoint cannot be used to
# discover which email addresses have accounts.
_GENERIC_OTP_MESSAGE = (
    "If an account exists for that email, a reset code has been sent to it."
)


def _auth_response(user) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(user.id),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserRead.model_validate(user),
    )


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
)
def signup(payload: UserCreate, db: DbSession) -> AuthResponse:
    try:
        user = auth_service.create_user(db, payload)
    except auth_service.EmailAlreadyRegistered:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from None
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from None

    logger.info("New user registered: %s", user.email)
    return _auth_response(user)


@router.post("/login", response_model=AuthResponse, summary="Log in and receive a token")
def login(payload: LoginRequest, db: DbSession) -> AuthResponse:
    try:
        user = auth_service.authenticate(db, payload.email, payload.password)
    except auth_service.InvalidCredentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        ) from None
    except auth_service.InactiveAccount:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact an administrator.",
        ) from None

    return _auth_response(user)


@router.get("/me", response_model=UserRead, summary="Current authenticated user")
def read_current_user(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.post("/logout", response_model=MessageResponse, summary="Log out")
def logout(current_user: CurrentUser) -> MessageResponse:
    """Server-side acknowledgement of logout.

    Access tokens are stateless and short-lived, so the client discards its
    token; this endpoint exists so logout is auditable and the frontend has a
    single place to hook into later (e.g. token denylisting).
    """
    logger.info("User logged out: %s", current_user.email)
    return MessageResponse(message="Logged out successfully.")


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password reset OTP",
)
def forgot_password(payload: ForgotPasswordRequest, db: DbSession) -> MessageResponse:
    user = auth_service.get_user_by_email(db, payload.email)
    if user is not None and user.is_active:
        otp_service.issue_otp(db, user)
    else:
        logger.info("Password reset requested for unknown/inactive email: %s", payload.email)
    return MessageResponse(message=_GENERIC_OTP_MESSAGE)


@router.post(
    "/verify-otp",
    response_model=MessageResponse,
    summary="Check a reset code without consuming it",
)
def verify_otp(payload: VerifyOTPRequest, db: DbSession) -> MessageResponse:
    user = auth_service.get_user_by_email(db, payload.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code.",
        )
    try:
        otp_service.verify_otp(db, user, payload.code, consume=False)
    except otp_service.OTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from None
    return MessageResponse(message="Code verified. You can now set a new password.")


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Set a new password using a reset code",
)
def reset_password(payload: ResetPasswordRequest, db: DbSession) -> MessageResponse:
    user = auth_service.get_user_by_email(db, payload.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code.",
        )
    try:
        otp_service.verify_otp(db, user, payload.code, consume=True)
    except otp_service.OTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from None

    try:
        auth_service.set_password(db, user, payload.new_password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from None

    logger.info("Password reset completed for %s", user.email)
    return MessageResponse(message="Password updated. You can now log in.")
