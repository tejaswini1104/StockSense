"""Product routes."""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.category import Category
from app.models.location import Location
from app.models.product import Product
from app.models.stock_ledger import StockLedger
from app.models.stock_quant import StockQuant
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate, StockQuantRead

router = APIRouter(prefix="/products", tags=["Products"])


def _build_product_read(p: Product, db: DbSession) -> ProductRead:
    # Fetch stock quants for product
    quants = db.scalars(
        select(StockQuant)
        .options(selectinload(StockQuant.location).selectinload(Location.warehouse))
        .where(StockQuant.product_id == p.id)
    ).all()

    stock_by_loc = []
    total_qty = 0.0

    for q in quants:
        total_qty += q.quantity
        stock_by_loc.append(
            StockQuantRead(
                id=q.id,
                product_id=q.product_id,
                location_id=q.location_id,
                quantity=q.quantity,
                location_name=q.location.name if q.location else None,
                warehouse_name=q.location.warehouse.name if (q.location and q.location.warehouse) else None,
            )
        )

    res = ProductRead.model_validate(p)
    res.total_stock = total_qty
    res.is_low_stock = total_qty <= p.min_reorder_qty
    res.stock_by_location = stock_by_loc
    return res


@router.get("", response_model=list[ProductRead])
def list_products(
    db: DbSession,
    current_user: CurrentUser,
    category_id: int | None = Query(default=None),
    low_stock_only: bool = Query(default=False),
    search: str | None = Query(default=None),
) -> list[ProductRead]:
    query = select(Product).options(selectinload(Product.category))

    if category_id is not None:
        query = query.where(Product.category_id == category_id)
    if search:
        search_term = f"%{search}%"
        query = query.where((Product.name.ilike(search_term)) | (Product.sku.ilike(search_term)))

    query = query.order_by(Product.name.asc())
    products = db.scalars(query).all()

    result = []
    for p in products:
        read_obj = _build_product_read(p, db)
        if low_stock_only and not read_obj.is_low_stock:
            continue
        result.append(read_obj)

    return result


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: DbSession, current_user: CurrentUser) -> ProductRead:
    # Check SKU uniqueness
    existing = db.scalars(select(Product).where(Product.sku == payload.sku)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with SKU '{payload.sku}' already exists.",
        )

    if payload.category_id:
        cat = db.get(Category, payload.category_id)
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category id {payload.category_id} not found.",
            )

    product = Product(
        sku=payload.sku,
        name=payload.name,
        description=payload.description,
        category_id=payload.category_id,
        uom=payload.uom,
        min_reorder_qty=payload.min_reorder_qty,
        max_reorder_qty=payload.max_reorder_qty,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    # Initial stock setup if provided
    if payload.initial_stock and payload.initial_stock > 0 and payload.initial_location_id:
        loc = db.get(Location, payload.initial_location_id)
        if loc:
            quant = StockQuant(
                product_id=product.id,
                location_id=payload.initial_location_id,
                quantity=payload.initial_stock,
            )
            db.add(quant)
            # Add initial stock ledger entry
            ledger = StockLedger(
                reference_number=f"INIT-{product.sku}",
                movement_type="INITIAL",
                product_id=product.id,
                destination_location_id=payload.initial_location_id,
                quantity=payload.initial_stock,
                notes="Initial Stock Creation",
                user_id=current_user.id,
            )
            db.add(ledger)
            db.commit()

    return _build_product_read(product, db)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: DbSession, current_user: CurrentUser) -> ProductRead:
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return _build_product_read(p, db)


@router.put("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int, payload: ProductUpdate, db: DbSession, current_user: CurrentUser
) -> ProductRead:
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    if payload.sku and payload.sku != p.sku:
        existing = db.scalars(select(Product).where(Product.sku == payload.sku)).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with SKU '{payload.sku}' already exists.",
            )
        p.sku = payload.sku

    if payload.name is not None:
        p.name = payload.name
    if payload.description is not None:
        p.description = payload.description
    if payload.category_id is not None:
        p.category_id = payload.category_id
    if payload.uom is not None:
        p.uom = payload.uom
    if payload.min_reorder_qty is not None:
        p.min_reorder_qty = payload.min_reorder_qty
    if payload.max_reorder_qty is not None:
        p.max_reorder_qty = payload.max_reorder_qty

    db.commit()
    db.refresh(p)
    return _build_product_read(p, db)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: DbSession, current_user: CurrentUser):
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    db.delete(p)
    db.commit()
