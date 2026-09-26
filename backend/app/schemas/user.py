"""User request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=72)
    role: UserRole = UserRole.STAFF


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: UserRole
    is_active: bool
    created_at: datetime
