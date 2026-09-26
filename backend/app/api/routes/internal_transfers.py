"""Internal Transfers routes."""

from datetime import datetime, timezone
import random
import string
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.internal_transfer import InternalTransfer, InternalTransferItem, TransferStatus
from app.models.location import Location
from app.models.product import Product
from app.models.stock_ledger import StockLedger
from app.models.stock_quant import StockQuant
from app.schemas.internal_transfer import (
    InternalTransferCreate,
    InternalTransferItemRead,
    InternalTransferRead,
)

router = APIRouter(prefix="/internal-transfers", tags=["Internal Transfers"])


def _generate_transfer_reference() -> str:
    digits = "".join(random.choices(string.digits, k=4))
    return f"INT-2026-{digits}"


def _build_transfer_read(tf: InternalTransfer) -> InternalTransferRead:
    items_read = []
    for item in tf.items:
        items_read.append(
            InternalTransferItemRead(
                id=item.id,
                transfer_id=item.transfer_id,
                product_id=item.product_id,
                quantity=item.quantity,
                product_name=item.product.name if item.product else None,
                product_sku=item.product.sku if item.product else None,
                product_uom=item.product.uom if item.product else None,
            )
        )

    res = InternalTransferRead.model_validate(tf)
    res.source_location_name = tf.source_location.name if tf.source_location else None
    res.source_warehouse_name = (
        tf.source_location.warehouse.name if (tf.source_location and tf.source_location.warehouse) else None
    )
    res.destination_location_name = tf.destination_location.name if tf.destination_location else None
    res.destination_warehouse_name = (
        tf.destination_location.warehouse.name
        if (tf.destination_location and tf.destination_location.warehouse)
        else None
    )
    res.items = items_read
    return res


@router.get("", response_model=list[InternalTransferRead])
def list_internal_transfers(
    db: DbSession,
    current_user: CurrentUser,
    status_filter: TransferStatus | None = Query(default=None, alias="status"),
) -> list[InternalTransferRead]:
    query = (
        select(InternalTransfer)
        .options(
            selectinload(InternalTransfer.source_location).selectinload(Location.warehouse),
            selectinload(InternalTransfer.destination_location).selectinload(Location.warehouse),
            selectinload(InternalTransfer.items).selectinload(InternalTransferItem.product),
        )
        .order_by(InternalTransfer.created_at.desc())
    )

    if status_filter:
        query = query.where(InternalTransfer.status == status_filter)

    transfers = db.scalars(query).all()
    return [_build_transfer_read(t) for t in transfers]


@router.post("", response_model=InternalTransferRead, status_code=status.HTTP_201_CREATED)
def create_internal_transfer(
    payload: InternalTransferCreate, db: DbSession, current_user: CurrentUser
) -> InternalTransferRead:
    # 1. Source and destination cannot be the same
    if payload.source_location_id == payload.destination_location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source location and destination location cannot be the same.",
        )

    # 2. Verify source & destination locations exist
    source_loc = db.get(Location, payload.source_location_id)
    if not source_loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source location id {payload.source_location_id} not found.",
        )

    dest_loc = db.get(Location, payload.destination_location_id)
    if not dest_loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination location id {payload.destination_location_id} not found.",
        )

    # 3. Verify items & products
    items_to_create = []
    for item_in in payload.items:
        p = db.get(Product, item_in.product_id)
        if not p:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product id {item_in.product_id} not found.",
            )
        items_to_create.append(InternalTransferItem(product_id=item_in.product_id, quantity=item_in.quantity))

    ref = _generate_transfer_reference()

    transfer = InternalTransfer(
        reference_number=ref,
        source_location_id=payload.source_location_id,
        destination_location_id=payload.destination_location_id,
        status=TransferStatus.DRAFT,
        notes=payload.notes,
        created_by_user_id=current_user.id,
        items=items_to_create,
    )

    db.add(transfer)
    db.commit()
    db.refresh(transfer)

    full_tf = db.scalars(
        select(InternalTransfer)
        .options(
            selectinload(InternalTransfer.source_location).selectinload(Location.warehouse),
            selectinload(InternalTransfer.destination_location).selectinload(Location.warehouse),
            selectinload(InternalTransfer.items).selectinload(InternalTransferItem.product),
        )
        .where(InternalTransfer.id == transfer.id)
    ).first()

    return _build_transfer_read(full_tf)


@router.get("/{transfer_id}", response_model=InternalTransferRead)
def get_internal_transfer(transfer_id: int, db: DbSession, current_user: CurrentUser) -> InternalTransferRead:
    tf = db.scalars(
        select(InternalTransfer)
        .options(
            selectinload(InternalTransfer.source_location).selectinload(Location.warehouse),
            selectinload(InternalTransfer.destination_location).selectinload(Location.warehouse),
            selectinload(InternalTransfer.items).selectinload(InternalTransferItem.product),
        )
        .where(InternalTransfer.id == transfer_id)
    ).first()

    if not tf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Internal transfer not found.")
    return _build_transfer_read(tf)


@router.post("/{transfer_id}/validate", response_model=InternalTransferRead)
def validate_internal_transfer(transfer_id: int, db: DbSession, current_user: CurrentUser) -> InternalTransferRead:
    tf = db.scalars(
        select(InternalTransfer)
        .options(
            selectinload(InternalTransfer.source_location).selectinload(Location.warehouse),
            selectinload(InternalTransfer.destination_location).selectinload(Location.warehouse),
            selectinload(InternalTransfer.items).selectinload(InternalTransferItem.product),
        )
        .where(InternalTransfer.id == transfer_id)
    ).first()

    if not tf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Internal transfer not found.")

    if tf.status == TransferStatus.DONE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer has already been validated.",
        )

    if tf.status == TransferStatus.CANCELED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Canceled transfer cannot be validated.",
        )

    # 1. Check source stock availability for all items BEFORE executing transfer
    for item in tf.items:
        source_quant = db.scalars(
            select(StockQuant).where(
                StockQuant.product_id == item.product_id,
                StockQuant.location_id == tf.source_location_id,
            )
        ).first()

        available_qty = source_quant.quantity if source_quant else 0.0
        if available_qty < item.quantity:
            prod_name = item.product.name if item.product else f"Product #{item.product_id}"
            loc_name = tf.source_location.name if tf.source_location else f"Location #{tf.source_location_id}"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{prod_name}' at '{loc_name}'. Available: {available_qty}, Requested: {item.quantity}.",
            )

    # 2. Atomic DB Transaction for updating source/destination stock quants & creating audit logs
    now = datetime.now(timezone.utc)

    for item in tf.items:
        # Deduct from Source Location
        source_quant = db.scalars(
            select(StockQuant).where(
                StockQuant.product_id == item.product_id,
                StockQuant.location_id == tf.source_location_id,
            )
        ).first()
        source_quant.quantity -= item.quantity

        # Add to Destination Location
        dest_quant = db.scalars(
            select(StockQuant).where(
                StockQuant.product_id == item.product_id,
                StockQuant.location_id == tf.destination_location_id,
            )
        ).first()

        if dest_quant:
            dest_quant.quantity += item.quantity
        else:
            dest_quant = StockQuant(
                product_id=item.product_id,
                location_id=tf.destination_location_id,
                quantity=item.quantity,
            )
            db.add(dest_quant)

        # Create Stock Ledger audit record
        ledger = StockLedger(
            reference_number=tf.reference_number,
            movement_type="INTERNAL_TRANSFER",
            product_id=item.product_id,
            source_location_id=tf.source_location_id,
            destination_location_id=tf.destination_location_id,
            quantity=item.quantity,
            notes=f"Transfer from {tf.source_location.name} to {tf.destination_location.name}",
            user_id=current_user.id,
        )
        db.add(ledger)

    tf.status = TransferStatus.DONE
    tf.completed_at = now

    db.commit()
    db.refresh(tf)

    return _build_transfer_read(tf)
