"""Warehouse & Location routes."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.location import Location, LocationType
from app.models.stock_quant import StockQuant
from app.models.warehouse import Warehouse
from app.schemas.warehouse import (
    LocationCreate,
    LocationRead,
    WarehouseCreate,
    WarehouseRead,
    WarehouseUpdate,
)

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])


def _build_warehouse_read(wh: Warehouse, db: DbSession) -> WarehouseRead:
    locations = db.scalars(select(Location).where(Location.warehouse_id == wh.id).order_by(Location.name.asc())).all()
    loc_reads = []
    for loc in locations:
        lr = LocationRead.model_validate(loc)
        lr.warehouse_name = wh.name
        loc_reads.append(lr)

    # Count distinct products stocked in this warehouse
    prod_count = (
        db.scalar(
            select(func.count(func.distinct(StockQuant.product_id)))
            .join(Location, StockQuant.location_id == Location.id)
            .where(Location.warehouse_id == wh.id)
        )
        or 0
    )

    res = WarehouseRead.model_validate(wh)
    res.locations = loc_reads
    res.total_locations_count = len(loc_reads)
    res.total_products_count = prod_count
    return res


@router.get("", response_model=list[WarehouseRead])
def list_warehouses(db: DbSession, current_user: CurrentUser) -> list[WarehouseRead]:
    warehouses = db.scalars(select(Warehouse).order_by(Warehouse.name.asc())).all()
    return [_build_warehouse_read(wh, db) for wh in warehouses]


@router.post("", response_model=WarehouseRead, status_code=status.HTTP_201_CREATED)
def create_warehouse(payload: WarehouseCreate, db: DbSession, current_user: CurrentUser) -> WarehouseRead:
    existing = db.scalars(select(Warehouse).where(Warehouse.code == payload.code)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Warehouse code '{payload.code}' already exists.",
        )

    wh = Warehouse(code=payload.code, name=payload.name, address=payload.address)
    db.add(wh)
    db.commit()
    db.refresh(wh)

    # Auto-create default locations: Main Stock & Receiving Dock
    loc_stock = Location(
        warehouse_id=wh.id,
        code=f"{wh.code}-STOCK",
        name="Main Stock",
        location_type=LocationType.INTERNAL,
    )
    loc_rec = Location(
        warehouse_id=wh.id,
        code=f"{wh.code}-REC",
        name="Receiving Dock",
        location_type=LocationType.RECEIVING,
    )
    db.add_all([loc_stock, loc_rec])
    db.commit()

    return _build_warehouse_read(wh, db)


@router.get("/locations/all", response_model=list[LocationRead])
def list_all_locations(db: DbSession, current_user: CurrentUser) -> list[LocationRead]:
    locations = db.scalars(
        select(Location).options(selectinload(Location.warehouse)).order_by(Location.name.asc())
    ).all()
    res = []
    for loc in locations:
        lr = LocationRead.model_validate(loc)
        lr.warehouse_name = loc.warehouse.name if loc.warehouse else None
        res.append(lr)
    return res


@router.get("/{warehouse_id}", response_model=WarehouseRead)
def get_warehouse(warehouse_id: int, db: DbSession, current_user: CurrentUser) -> WarehouseRead:
    wh = db.get(Warehouse, warehouse_id)
    if not wh:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found.")
    return _build_warehouse_read(wh, db)


@router.post("/{warehouse_id}/locations", response_model=LocationRead, status_code=status.HTTP_201_CREATED)
def create_location(
    warehouse_id: int, payload: LocationCreate, db: DbSession, current_user: CurrentUser
) -> LocationRead:
    wh = db.get(Warehouse, warehouse_id)
    if not wh:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found.")

    existing = db.scalars(select(Location).where(Location.code == payload.code)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Location code '{payload.code}' already exists.",
        )

    loc = Location(
        warehouse_id=warehouse_id,
        code=payload.code,
        name=payload.name,
        location_type=payload.location_type,
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)

    lr = LocationRead.model_validate(loc)
    lr.warehouse_name = wh.name
    return lr
