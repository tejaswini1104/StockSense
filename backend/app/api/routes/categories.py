"""Category routes."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryRead

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(db: DbSession, current_user: CurrentUser) -> list[CategoryRead]:
    categories = db.scalars(select(Category).order_by(Category.name.asc())).all()
    return [CategoryRead.model_validate(c) for c in categories]


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: DbSession, current_user: CurrentUser) -> CategoryRead:
    existing = db.scalars(select(Category).where(Category.name == payload.name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category with name '{payload.name}' already exists.",
        )
    cat = Category(name=payload.name, description=payload.description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return CategoryRead.model_validate(cat)
