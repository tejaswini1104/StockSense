"""Warehouse & Location routes."""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.warehouse import Location, Warehouse
from app.models.product import ProductLocationStock
from app.schemas.catalog import LocationRead, WarehouseRead

router = APIRouter(tags=["Warehouses"])


def _build_warehouse_read(wh: Warehouse, db: DbSession) -> WarehouseRead:
    locations = db.scalars(select(Location).where(Location.warehouse_id == wh.id).order_by(Location.name.asc())).all()
    loc_reads = []
    for loc in locations:
        lr = LocationRead.model_validate(loc)
        loc_reads.append(lr)

    # Count distinct products stocked in this warehouse
    prod_count = (
        db.scalar(
            select(func.count(func.distinct(ProductLocationStock.product_id)))
            .join(Location, ProductLocationStock.location_id == Location.id)
            .where(Location.warehouse_id == wh.id)
        )
        or 0
    )

    res = WarehouseRead.model_validate(wh)
    res.locations = loc_reads
    return res


@router.get("/warehouses", response_model=list[WarehouseRead], summary="List warehouses")
def list_warehouses(db: DbSession, current_user: CurrentUser) -> list[WarehouseRead]:
    warehouses = db.scalars(select(Warehouse).order_by(Warehouse.name.asc())).all()
    return [_build_warehouse_read(wh, db) for wh in warehouses]


@router.post("/warehouses", response_model=WarehouseRead, status_code=status.HTTP_201_CREATED, summary="Create a warehouse")
def create_warehouse(payload: dict, db: DbSession, current_user: CurrentUser) -> WarehouseRead:
    code = payload.get("code")
    name = payload.get("name")
    address = payload.get("address")

    if not code or not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Code and Name are required.")

    existing = db.scalars(select(Warehouse).where(Warehouse.code == code)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Warehouse code '{code}' already exists.",
        )

    wh = Warehouse(code=code, name=name, address=address)
    db.add(wh)
    db.commit()
    db.refresh(wh)

    # Auto-create default location: Main Stock
    loc_stock = Location(
        warehouse_id=wh.id,
        code=f"{wh.code}-STOCK",
        name="Main Stock",
        is_active=True,
    )
    db.add(loc_stock)
    db.commit()

    return _build_warehouse_read(wh, db)


@router.get("/locations", response_model=list[LocationRead], summary="List stock locations")
@router.get("/warehouses/locations/all", response_model=list[LocationRead])
def list_locations(
    db: DbSession, current_user: CurrentUser, warehouse_id: int | None = Query(default=None)
) -> list[LocationRead]:
    stmt = select(Location).options(selectinload(Location.warehouse)).order_by(Location.code.asc())
    if warehouse_id is not None:
        stmt = stmt.where(Location.warehouse_id == warehouse_id)
    locations = db.scalars(stmt).all()
    return [LocationRead.model_validate(loc) for loc in locations]


@router.get("/warehouses/{warehouse_id}", response_model=WarehouseRead)
def get_warehouse(warehouse_id: int, db: DbSession, current_user: CurrentUser) -> WarehouseRead:
    wh = db.get(Warehouse, warehouse_id)
    if not wh:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found.")
    return _build_warehouse_read(wh, db)
