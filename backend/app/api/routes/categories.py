"""Category routes."""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.auth import MessageResponse
from app.schemas.catalog import CategoryCreate, CategoryRead, CategoryUpdate
from app.services import catalog_service

router = APIRouter(prefix="/categories", tags=["Categories"])


def _to_read(category, product_count: int) -> CategoryRead:
    return CategoryRead(
        id=category.id,
        name=category.name,
        description=category.description,
        is_active=category.is_active,
        product_count=product_count,
        created_at=category.created_at,
    )


@router.get("", response_model=list[CategoryRead], summary="List categories")
def list_categories(
    db: DbSession,
    current_user: CurrentUser,
    include_inactive: bool = Query(False, description="Include deactivated categories"),
) -> list[CategoryRead]:
    rows = catalog_service.list_categories(db, include_inactive=include_inactive)
    return [_to_read(category, count) for category, count in rows]


@router.post(
    "",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a category",
)
def create_category(
    payload: CategoryCreate, db: DbSession, current_user: CurrentUser
) -> CategoryRead:
    try:
        category = catalog_service.create_category(db, payload)
    except catalog_service.DuplicateCategoryName:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A category named '{payload.name}' already exists.",
        ) from None
    return _to_read(category, 0)


@router.patch("/{category_id}", response_model=CategoryRead, summary="Update a category")
def update_category(
    category_id: int, payload: CategoryUpdate, db: DbSession, current_user: CurrentUser
) -> CategoryRead:
    try:
        category = catalog_service.update_category(db, category_id, payload)
    except catalog_service.CategoryNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found."
        ) from None
    except catalog_service.DuplicateCategoryName as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A category named '{exc.args[0]}' already exists.",
        ) from None
    return _to_read(category, len(category.products))


@router.delete("/{category_id}", response_model=MessageResponse, summary="Delete a category")
def delete_category(
    category_id: int, db: DbSession, current_user: CurrentUser
) -> MessageResponse:
    try:
        catalog_service.delete_category(db, category_id)
    except catalog_service.CategoryNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found."
        ) from None
    except catalog_service.CategoryInUse as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"This category is used by {exc.args[0]} product(s). "
                "Reassign them or deactivate the category instead."
            ),
        ) from None
    return MessageResponse(message="Category deleted.")
