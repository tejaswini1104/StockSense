"""Category, product and stock read/write logic.

Stock rules enforced here:
  * a product's on-hand figure is the sum of its ProductLocationStock rows --
    never a column on the product itself
  * initial stock is written to a real location row, so it is visible to every
    later operation (receipts, deliveries, transfers, adjustments)
  * SKUs are unique case-insensitively
"""

from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.category import Category
from app.models.product import Product, ProductLocationStock
from app.models.warehouse import Location, Warehouse
from app.schemas.catalog import (
    CategoryCreate,
    CategoryUpdate,
    ProductCreate,
    ProductUpdate,
    StockByLocation,
)

ZERO = Decimal("0")

DEFAULT_WAREHOUSE_CODE = "WH-MAIN"
DEFAULT_LOCATION_CODE = "STOCK"


class DuplicateSKU(Exception):
    """Raised when a SKU is already taken by another product."""


class DuplicateCategoryName(Exception):
    """Raised when a category name is already taken."""


class CategoryNotFound(Exception):
    pass


class ProductNotFound(Exception):
    pass


class LocationNotFound(Exception):
    pass


class CategoryInUse(Exception):
    """Raised when deleting a category that still has products."""


# --------------------------------------------------------------------------- #
# Categories
# --------------------------------------------------------------------------- #


def _category_name_taken(db: Session, name: str, *, exclude_id: int | None = None) -> bool:
    stmt = select(Category.id).where(func.lower(Category.name) == name.strip().lower())
    if exclude_id is not None:
        stmt = stmt.where(Category.id != exclude_id)
    return db.scalars(stmt).first() is not None


def list_categories(db: Session, *, include_inactive: bool = False) -> list[tuple[Category, int]]:
    """Return categories with how many products each holds."""
    stmt = (
        select(Category, func.count(Product.id))
        .outerjoin(Product, Product.category_id == Category.id)
        .group_by(Category.id)
        .order_by(Category.name)
    )
    if not include_inactive:
        stmt = stmt.where(Category.is_active.is_(True))
    return [(row[0], row[1]) for row in db.execute(stmt).all()]


def get_category(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise CategoryNotFound(category_id)
    return category


def create_category(db: Session, payload: CategoryCreate) -> Category:
    if _category_name_taken(db, payload.name):
        raise DuplicateCategoryName(payload.name)
    category = Category(name=payload.name, description=payload.description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category_id: int, payload: CategoryUpdate) -> Category:
    category = get_category(db, category_id)
    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"] is not None:
        if _category_name_taken(db, data["name"], exclude_id=category_id):
            raise DuplicateCategoryName(data["name"])
        category.name = data["name"].strip()
    if "description" in data:
        category.description = data["description"]
    if "is_active" in data and data["is_active"] is not None:
        category.is_active = data["is_active"]

    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int) -> None:
    """Delete a category, but only while no product references it."""
    category = get_category(db, category_id)
    in_use = db.scalars(
        select(func.count(Product.id)).where(Product.category_id == category_id)
    ).one()
    if in_use:
        raise CategoryInUse(in_use)
    db.delete(category)
    db.commit()


# --------------------------------------------------------------------------- #
# Warehouses / locations
# --------------------------------------------------------------------------- #


def list_warehouses(db: Session) -> list[Warehouse]:
    return list(
        db.scalars(
            select(Warehouse)
            .options(selectinload(Warehouse.locations))
            .order_by(Warehouse.name)
        ).all()
    )


def list_locations(db: Session, *, warehouse_id: int | None = None) -> list[Location]:
    stmt = select(Location).options(joinedload(Location.warehouse)).order_by(Location.code)
    if warehouse_id is not None:
        stmt = stmt.where(Location.warehouse_id == warehouse_id)
    return list(db.scalars(stmt).all())


def ensure_default_location(db: Session) -> Location:
    """Return the fallback stock location, creating it on first use.

    Products can be given an initial quantity before anyone has set up
    warehouses, so a single default location guarantees that quantity lands on
    a real stock row instead of being silently dropped.
    """
    warehouse = db.scalars(
        select(Warehouse).where(Warehouse.code == DEFAULT_WAREHOUSE_CODE)
    ).first()
    if warehouse is None:
        warehouse = Warehouse(
            name="Main Warehouse", code=DEFAULT_WAREHOUSE_CODE, is_active=True
        )
        db.add(warehouse)
        db.flush()

    location = db.scalars(
        select(Location).where(
            Location.warehouse_id == warehouse.id,
            Location.code == DEFAULT_LOCATION_CODE,
        )
    ).first()
    if location is None:
        location = Location(
            warehouse_id=warehouse.id,
            name="Main Stock",
            code=DEFAULT_LOCATION_CODE,
            is_active=True,
        )
        db.add(location)
        db.flush()
    return location


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #


def _sku_taken(db: Session, sku: str, *, exclude_id: int | None = None) -> bool:
    stmt = select(Product.id).where(func.upper(Product.sku) == sku.strip().upper())
    if exclude_id is not None:
        stmt = stmt.where(Product.id != exclude_id)
    return db.scalars(stmt).first() is not None


def total_stock_for(db: Session, product_id: int) -> Decimal:
    total = db.scalars(
        select(func.coalesce(func.sum(ProductLocationStock.quantity), 0)).where(
            ProductLocationStock.product_id == product_id
        )
    ).one()
    return Decimal(total)


def stock_status(total: Decimal, reorder_level: Decimal) -> str:
    if total <= ZERO:
        return "out_of_stock"
    if reorder_level > ZERO and total <= reorder_level:
        return "low_stock"
    return "in_stock"


def stock_by_location(db: Session, product_id: int) -> list[StockByLocation]:
    rows = db.execute(
        select(
            Location.id,
            Location.name,
            Location.code,
            Warehouse.id,
            Warehouse.name,
            ProductLocationStock.quantity,
        )
        .join(Location, Location.id == ProductLocationStock.location_id)
        .join(Warehouse, Warehouse.id == Location.warehouse_id)
        .where(ProductLocationStock.product_id == product_id)
        .order_by(Warehouse.name, Location.code)
    ).all()
    return [
        StockByLocation(
            location_id=row[0],
            location_name=row[1],
            location_code=row[2],
            warehouse_id=row[3],
            warehouse_name=row[4],
            quantity=Decimal(row[5]),
        )
        for row in rows
    ]


def get_product(db: Session, product_id: int) -> Product:
    product = db.scalars(
        select(Product).options(joinedload(Product.category)).where(Product.id == product_id)
    ).first()
    if product is None:
        raise ProductNotFound(product_id)
    return product


def search_products(
    db: Session,
    *,
    search: str | None = None,
    category_id: int | None = None,
    is_active: bool | None = None,
    stock_filter: str | None = None,
    page: int = 1,
    page_size: int = 25,
) -> tuple[list[tuple[Product, Decimal]], int]:
    """Return a page of products with their total stock, plus the total count.

    ``stock_filter`` accepts ``low_stock``, ``out_of_stock`` or ``in_stock`` and
    is applied to the summed on-hand quantity, not to any cached column.
    """
    total_expr = func.coalesce(func.sum(ProductLocationStock.quantity), 0)

    stmt = (
        select(Product, total_expr.label("total_stock"))
        .outerjoin(
            ProductLocationStock, ProductLocationStock.product_id == Product.id
        )
        # selectinload, not joinedload: this query is grouped, and PostgreSQL
        # rejects joined category columns that are not in the GROUP BY.
        .options(selectinload(Product.category))
        .group_by(Product.id)
    )

    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Product.name).like(term),
                func.lower(Product.sku).like(term),
            )
        )
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if is_active is not None:
        stmt = stmt.where(Product.is_active.is_(is_active))

    if stock_filter == "out_of_stock":
        stmt = stmt.having(total_expr <= 0)
    elif stock_filter == "low_stock":
        # Low means at or below a reorder level that was actually set, but not
        # yet fully out of stock.
        stmt = stmt.having(total_expr > 0).having(total_expr <= Product.reorder_level)
    elif stock_filter == "in_stock":
        stmt = stmt.having(total_expr > 0)

    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = db.scalars(count_stmt).one()

    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)
    rows = db.execute(
        stmt.order_by(Product.name).limit(page_size).offset((page - 1) * page_size)
    ).unique().all()

    return [(row[0], Decimal(row[1])) for row in rows], total


def create_product(db: Session, payload: ProductCreate) -> Product:
    """Create a product and, if asked, seed stock at a location.

    Runs as one transaction: if the stock row cannot be written, the product is
    not created either, so a product can never exist with its initial stock
    silently lost.
    """
    if _sku_taken(db, payload.sku):
        raise DuplicateSKU(payload.sku)
    if payload.category_id is not None:
        get_category(db, payload.category_id)

    product = Product(
        name=payload.name,
        sku=payload.sku,
        description=payload.description,
        category_id=payload.category_id,
        unit_of_measure=payload.unit_of_measure,
        reorder_level=payload.reorder_level,
        is_active=True,
    )
    db.add(product)
    db.flush()

    if payload.initial_stock > ZERO:
        if payload.initial_location_id is not None:
            location = db.get(Location, payload.initial_location_id)
            if location is None:
                db.rollback()
                raise LocationNotFound(payload.initial_location_id)
        else:
            location = ensure_default_location(db)

        db.add(
            ProductLocationStock(
                product_id=product.id,
                location_id=location.id,
                quantity=payload.initial_stock,
            )
        )

    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, payload: ProductUpdate) -> Product:
    product = get_product(db, product_id)
    data = payload.model_dump(exclude_unset=True)

    if "sku" in data and data["sku"] is not None:
        if _sku_taken(db, data["sku"], exclude_id=product_id):
            raise DuplicateSKU(data["sku"])
        product.sku = data["sku"]
    if "category_id" in data:
        if data["category_id"] is not None:
            get_category(db, data["category_id"])
        product.category_id = data["category_id"]

    for field in ("name", "description", "unit_of_measure", "reorder_level", "is_active"):
        if field in data and data[field] is not None:
            setattr(product, field, data[field])

    db.commit()
    db.refresh(product)
    return product
