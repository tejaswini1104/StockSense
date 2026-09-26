"""User profile routes."""

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserRead, summary="Read my profile")
def read_my_profile(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead, summary="Update my profile")
def update_my_profile(
    payload: UserUpdate, db: DbSession, current_user: CurrentUser
) -> UserRead:
    if payload.name is not None:
        current_user.name = payload.name.strip()
    db.commit()
    db.refresh(current_user)
    return UserRead.model_validate(current_user)
