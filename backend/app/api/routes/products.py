"""Product routes."""

import math
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser, DbSession
from app.models.product import Product
from app.schemas.catalog import (
    CategorySummary,
    ProductCreate,
    ProductDetail,
    ProductListResponse,
    ProductRead,
    ProductUpdate,
    StockByLocation,
)
from app.services import catalog_service

router = APIRouter(prefix="/products", tags=["Products"])

STOCK_FILTERS = ("in_stock", "low_stock", "out_of_stock")


def _to_read(product: Product, total: Decimal) -> ProductRead:
    return ProductRead(
        id=product.id,
        name=product.name,
        sku=product.sku,
        description=product.description,
        unit_of_measure=product.unit_of_measure,
        reorder_level=product.reorder_level,
        is_active=product.is_active,
        created_at=product.created_at,
        category=(
            CategorySummary(id=product.category.id, name=product.category.name)
            if product.category
            else None
        ),
        total_stock=total,
        stock_status=catalog_service.stock_status(total, product.reorder_level),
    )


@router.get("", response_model=ProductListResponse, summary="List and search products")
def list_products(
    db: DbSession,
    current_user: CurrentUser,
    search: str | None = Query(None, description="Match against product name or SKU"),
    category_id: int | None = Query(None),
    is_active: bool | None = Query(None),
    stock: str | None = Query(None, description="in_stock | low_stock | out_of_stock"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
) -> ProductListResponse:
    if stock is not None and stock not in STOCK_FILTERS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"stock must be one of: {', '.join(STOCK_FILTERS)}",
        )

    rows, total = catalog_service.search_products(
        db,
        search=search,
        category_id=category_id,
        is_active=is_active,
        stock_filter=stock,
        page=page,
        page_size=page_size,
    )
    return ProductListResponse(
        items=[_to_read(product, stock_total) for product, stock_total in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(math.ceil(total / page_size), 1),
    )


@router.post(
    "",
    response_model=ProductDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create a product",
)
def create_product(
    payload: ProductCreate, db: DbSession, current_user: CurrentUser
) -> ProductDetail:
    try:
        product = catalog_service.create_product(db, payload)
    except catalog_service.DuplicateSKU as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SKU '{exc.args[0]}' is already used by another product.",
        ) from None
    except catalog_service.CategoryNotFound:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The selected category does not exist.",
        ) from None
    except catalog_service.LocationNotFound:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The selected stock location does not exist.",
        ) from None

    return _detail(db, product)


@router.get("/{product_id}", response_model=ProductDetail, summary="Product detail")
def read_product(product_id: int, db: DbSession, current_user: CurrentUser) -> ProductDetail:
    try:
        product = catalog_service.get_product(db, product_id)
    except catalog_service.ProductNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found."
        ) from None
    return _detail(db, product)


@router.patch("/{product_id}", response_model=ProductDetail, summary="Update a product")
def update_product(
    product_id: int, payload: ProductUpdate, db: DbSession, current_user: CurrentUser
) -> ProductDetail:
    try:
        product = catalog_service.update_product(db, product_id, payload)
    except catalog_service.ProductNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found."
        ) from None
    except catalog_service.DuplicateSKU as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SKU '{exc.args[0]}' is already used by another product.",
        ) from None
    except catalog_service.CategoryNotFound:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The selected category does not exist.",
        ) from None
    return _detail(db, product)


@router.get(
    "/{product_id}/stock",
    response_model=list[StockByLocation],
    summary="Stock of one product per location",
)
def read_product_stock(
    product_id: int, db: DbSession, current_user: CurrentUser
) -> list[StockByLocation]:
    try:
        catalog_service.get_product(db, product_id)
    except catalog_service.ProductNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found."
        ) from None
    return catalog_service.stock_by_location(db, product_id)


def _detail(db, product: Product) -> ProductDetail:
    total = catalog_service.total_stock_for(db, product.id)
    base = _to_read(product, total)
    return ProductDetail(
        **base.model_dump(),
        stock_by_location=catalog_service.stock_by_location(db, product.id),
    )
