"""Authentication, signup and password-reset schemas."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(Token):
    """Token plus the authenticated user, so the client needs only one call."""

    model_config = ConfigDict(from_attributes=True)

    user: UserRead


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=10)


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=10)
    new_password: str = Field(min_length=8, max_length=72)


class MessageResponse(BaseModel):
    message: str
