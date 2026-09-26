"""Delivery Order routes (Outgoing stock operations)."""

from datetime import datetime, timezone
import random
import string
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.delivery import DeliveryItem, DeliveryOrder, DeliveryStatus
from app.models.location import Location
from app.models.product import Product, ProductLocationStock
from app.models.stock_ledger import StockLedger
from app.models.stock_quant import StockQuant
from app.schemas.delivery import (
    DeliveryItemRead,
    DeliveryOrderCreate,
    DeliveryOrderRead,
    DeliveryOrderUpdate,
)

router = APIRouter(prefix="/deliveries", tags=["Deliveries"])


def _generate_reference() -> str:
    digits = "".join(random.choices(string.digits, k=4))
    return f"DEL-2026-{digits}"


def _build_delivery_read(del_order: DeliveryOrder) -> DeliveryOrderRead:
    items_read = []
    for item in del_order.items:
        items_read.append(
            DeliveryItemRead(
                id=item.id,
                delivery_order_id=item.delivery_order_id,
                product_id=item.product_id,
                quantity=item.quantity,
                product_name=item.product.name if item.product else None,
                product_sku=item.product.sku if item.product else None,
                product_uom=getattr(item.product, "unit_of_measure", None) or getattr(item.product, "uom", None) if item.product else None,
            )
        )

    res = DeliveryOrderRead.model_validate(del_order)
    res.source_location_name = del_order.source_location.name if del_order.source_location else None
    res.warehouse_name = (
        del_order.source_location.warehouse.name
        if (del_order.source_location and del_order.source_location.warehouse)
        else None
    )
    res.items = items_read
    return res


@router.get("", response_model=list[DeliveryOrderRead])
def list_deliveries(
    db: DbSession,
    current_user: CurrentUser,
    status_filter: DeliveryStatus | None = Query(default=None, alias="status"),
) -> list[DeliveryOrderRead]:
    query = (
        select(DeliveryOrder)
        .options(
            selectinload(DeliveryOrder.source_location).selectinload(Location.warehouse),
            selectinload(DeliveryOrder.items).selectinload(DeliveryItem.product),
        )
        .order_by(DeliveryOrder.created_at.desc())
    )

    if status_filter:
        query = query.where(DeliveryOrder.status == status_filter)

    deliveries = db.scalars(query).all()
    return [_build_delivery_read(d) for d in deliveries]


@router.post("", response_model=DeliveryOrderRead, status_code=status.HTTP_201_CREATED)
def create_delivery(payload: DeliveryOrderCreate, db: DbSession, current_user: CurrentUser) -> DeliveryOrderRead:
    # Verify source location exists
    loc = db.get(Location, payload.source_location_id)
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location id {payload.source_location_id} not found.",
        )

    # Verify products exist
    items_to_create = []
    for item_in in payload.items:
        p = db.get(Product, item_in.product_id)
        if not p:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product id {item_in.product_id} not found.",
            )
        items_to_create.append(DeliveryItem(product_id=item_in.product_id, quantity=item_in.quantity))

    ref = _generate_reference()

    delivery = DeliveryOrder(
        reference_number=ref,
        customer_name=payload.customer_name,
        source_location_id=payload.source_location_id,
        status=DeliveryStatus.DRAFT,
        notes=payload.notes,
        created_by_user_id=current_user.id,
        items=items_to_create,
    )

    db.add(delivery)
    db.commit()
    db.refresh(delivery)

    # Re-query with eager loads
    full_delivery = db.scalars(
        select(DeliveryOrder)
        .options(
            selectinload(DeliveryOrder.source_location).selectinload(Location.warehouse),
            selectinload(DeliveryOrder.items).selectinload(DeliveryItem.product),
        )
        .where(DeliveryOrder.id == delivery.id)
    ).first()

    return _build_delivery_read(full_delivery)


@router.get("/{delivery_id}", response_model=DeliveryOrderRead)
def get_delivery(delivery_id: int, db: DbSession, current_user: CurrentUser) -> DeliveryOrderRead:
    del_order = db.scalars(
        select(DeliveryOrder)
        .options(
            selectinload(DeliveryOrder.source_location).selectinload(Location.warehouse),
            selectinload(DeliveryOrder.items).selectinload(DeliveryItem.product),
        )
        .where(DeliveryOrder.id == delivery_id)
    ).first()

    if not del_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery order not found.")
    return _build_delivery_read(del_order)


@router.put("/{delivery_id}", response_model=DeliveryOrderRead)
def update_delivery(
    delivery_id: int,
    payload: DeliveryOrderUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> DeliveryOrderRead:
    del_order = db.scalars(
        select(DeliveryOrder)
        .options(
            selectinload(DeliveryOrder.source_location).selectinload(Location.warehouse),
            selectinload(DeliveryOrder.items).selectinload(DeliveryItem.product),
        )
        .where(DeliveryOrder.id == delivery_id)
    ).first()

    if not del_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery order not found.")

    if del_order.status in (DeliveryStatus.DONE, DeliveryStatus.CANCELED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update a delivery order with status '{del_order.status.value}'.",
        )

    if payload.customer_name is not None:
        del_order.customer_name = payload.customer_name
    if payload.notes is not None:
        del_order.notes = payload.notes
    if payload.source_location_id is not None:
        loc = db.get(Location, payload.source_location_id)
        if not loc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Location {payload.source_location_id} not found.")
        del_order.source_location_id = payload.source_location_id

    if payload.status is not None:
        del_order.status = payload.status

    if payload.items is not None:
        # Re-build items list
        del_order.items.clear()
        for item_in in payload.items:
            p = db.get(Product, item_in.product_id)
            if not p:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item_in.product_id} not found.")
            del_order.items.append(DeliveryItem(product_id=item_in.product_id, quantity=item_in.quantity))

    db.commit()
    db.refresh(del_order)
    return _build_delivery_read(del_order)


@router.post("/{delivery_id}/pick", response_model=DeliveryOrderRead)
def pick_delivery(delivery_id: int, db: DbSession, current_user: CurrentUser) -> DeliveryOrderRead:
    del_order = db.scalars(
        select(DeliveryOrder)
        .options(
            selectinload(DeliveryOrder.source_location).selectinload(Location.warehouse),
            selectinload(DeliveryOrder.items).selectinload(DeliveryItem.product),
        )
        .where(DeliveryOrder.id == delivery_id)
    ).first()

    if not del_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery order not found.")

    if del_order.status in (DeliveryStatus.DONE, DeliveryStatus.CANCELED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Delivery order is already {del_order.status.value}.",
        )

    del_order.status = DeliveryStatus.PICKED
    db.commit()
    db.refresh(del_order)
    return _build_delivery_read(del_order)


@router.post("/{delivery_id}/pack", response_model=DeliveryOrderRead)
def pack_delivery(delivery_id: int, db: DbSession, current_user: CurrentUser) -> DeliveryOrderRead:
    del_order = db.scalars(
        select(DeliveryOrder)
        .options(
            selectinload(DeliveryOrder.source_location).selectinload(Location.warehouse),
            selectinload(DeliveryOrder.items).selectinload(DeliveryItem.product),
        )
        .where(DeliveryOrder.id == delivery_id)
    ).first()

    if not del_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery order not found.")

    if del_order.status in (DeliveryStatus.DONE, DeliveryStatus.CANCELED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Delivery order is already {del_order.status.value}.",
        )

    del_order.status = DeliveryStatus.PACKED
    db.commit()
    db.refresh(del_order)
    return _build_delivery_read(del_order)


@router.post("/{delivery_id}/validate", response_model=DeliveryOrderRead)
def validate_delivery(delivery_id: int, db: DbSession, current_user: CurrentUser) -> DeliveryOrderRead:
    del_order = db.scalars(
        select(DeliveryOrder)
        .options(
            selectinload(DeliveryOrder.source_location).selectinload(Location.warehouse),
            selectinload(DeliveryOrder.items).selectinload(DeliveryItem.product),
        )
        .where(DeliveryOrder.id == delivery_id)
    ).first()

    if not del_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery order not found.")

    if del_order.status == DeliveryStatus.DONE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery order has already been validated and processed.",
        )

    if del_order.status == DeliveryStatus.CANCELED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Canceled delivery order cannot be validated.",
        )

    # 1. Stock Availability Check (Never allow negative stock!)
    stock_checks = []
    for item in del_order.items:
        # Check StockQuant
        quant = db.scalars(
            select(StockQuant).where(
                StockQuant.product_id == item.product_id,
                StockQuant.location_id == del_order.source_location_id,
            )
        ).first()

        # Check ProductLocationStock
        loc_stock = db.scalars(
            select(ProductLocationStock).where(
                ProductLocationStock.product_id == item.product_id,
                ProductLocationStock.location_id == del_order.source_location_id,
            )
        ).first()

        available_stock = float(quant.quantity) if quant else (float(loc_stock.quantity) if loc_stock else 0.0)

        if available_stock < item.quantity:
            product_name = item.product.name if item.product else f"Product ID #{item.product_id}"
            product_sku = item.product.sku if item.product else ""
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product '{product_name}' (SKU: {product_sku}) at source location. Available: {available_stock}, Requested: {item.quantity}.",
            )
        stock_checks.append((item, quant, loc_stock, available_stock))

    # 2. Atomic DB Transaction: Deduct stock and record ledger entries
    now = datetime.now(timezone.utc)

    for item, quant, loc_stock, _avail in stock_checks:
        # Update StockQuant
        if quant:
            quant.quantity -= item.quantity
        else:
            # Create quant if missing (though avail check passed, e.g. from loc_stock)
            quant = StockQuant(
                product_id=item.product_id,
                location_id=del_order.source_location_id,
                quantity=0.0,
            )
            db.add(quant)

        # Update ProductLocationStock
        if loc_stock:
            loc_stock.quantity -= type(loc_stock.quantity)(item.quantity)
        else:
            loc_stock = ProductLocationStock(
                product_id=item.product_id,
                location_id=del_order.source_location_id,
                quantity=0,
            )
            db.add(loc_stock)

        # Create Stock Ledger entry
        ledger = StockLedger(
            reference_number=del_order.reference_number,
            movement_type="DELIVERY",
            product_id=item.product_id,
            source_location_id=del_order.source_location_id,
            destination_location_id=None,  # Delivery to customer/external
            quantity=item.quantity,
            notes=f"Delivery order to {del_order.customer_name}",
            user_id=current_user.id,
        )
        db.add(ledger)

    del_order.status = DeliveryStatus.DONE
    del_order.delivered_at = now

    db.commit()
    db.refresh(del_order)

    return _build_delivery_read(del_order)
