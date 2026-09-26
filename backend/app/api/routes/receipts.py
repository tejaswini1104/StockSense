"""Receipt routes (Incoming stock operations)."""

from datetime import datetime, timezone
import random
import string
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.location import Location
from app.models.product import Product
from app.models.receipt import Receipt, ReceiptItem, ReceiptStatus
from app.models.stock_ledger import StockLedger
from app.models.stock_quant import StockQuant
from app.schemas.receipt import ReceiptCreate, ReceiptItemRead, ReceiptRead

router = APIRouter(prefix="/receipts", tags=["Receipts"])


def _generate_reference() -> str:
    digits = "".join(random.choices(string.digits, k=4))
    return f"REC-2026-{digits}"


def _build_receipt_read(rec: Receipt) -> ReceiptRead:
    items_read = []
    for item in rec.items:
        items_read.append(
            ReceiptItemRead(
                id=item.id,
                receipt_id=item.receipt_id,
                product_id=item.product_id,
                quantity=item.quantity,
                product_name=item.product.name if item.product else None,
                product_sku=item.product.sku if item.product else None,
                product_uom=item.product.uom if item.product else None,
            )
        )

    res = ReceiptRead.model_validate(rec)
    res.destination_location_name = rec.destination_location.name if rec.destination_location else None
    res.warehouse_name = (
        rec.destination_location.warehouse.name
        if (rec.destination_location and rec.destination_location.warehouse)
        else None
    )
    res.items = items_read
    return res


@router.get("", response_model=list[ReceiptRead])
def list_receipts(
    db: DbSession,
    current_user: CurrentUser,
    status_filter: ReceiptStatus | None = Query(default=None, alias="status"),
) -> list[ReceiptRead]:
    query = (
        select(Receipt)
        .options(
            selectinload(Receipt.destination_location).selectinload(Location.warehouse),
            selectinload(Receipt.items).selectinload(ReceiptItem.product),
        )
        .order_by(Receipt.created_at.desc())
    )

    if status_filter:
        query = query.where(Receipt.status == status_filter)

    receipts = db.scalars(query).all()
    return [_build_receipt_read(r) for r in receipts]


@router.post("", response_model=ReceiptRead, status_code=status.HTTP_201_CREATED)
def create_receipt(payload: ReceiptCreate, db: DbSession, current_user: CurrentUser) -> ReceiptRead:
    # Verify location exists
    loc = db.get(Location, payload.destination_location_id)
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location id {payload.destination_location_id} not found.",
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
        items_to_create.append(ReceiptItem(product_id=item_in.product_id, quantity=item_in.quantity))

    ref = _generate_reference()

    receipt = Receipt(
        reference_number=ref,
        supplier_name=payload.supplier_name,
        destination_location_id=payload.destination_location_id,
        status=ReceiptStatus.DRAFT,
        notes=payload.notes,
        created_by_user_id=current_user.id,
        items=items_to_create,
    )

    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    # Re-query with eager loads
    full_receipt = db.scalars(
        select(Receipt)
        .options(
            selectinload(Receipt.destination_location).selectinload(Location.warehouse),
            selectinload(Receipt.items).selectinload(ReceiptItem.product),
        )
        .where(Receipt.id == receipt.id)
    ).first()

    return _build_receipt_read(full_receipt)


@router.get("/{receipt_id}", response_model=ReceiptRead)
def get_receipt(receipt_id: int, db: DbSession, current_user: CurrentUser) -> ReceiptRead:
    rec = db.scalars(
        select(Receipt)
        .options(
            selectinload(Receipt.destination_location).selectinload(Location.warehouse),
            selectinload(Receipt.items).selectinload(ReceiptItem.product),
        )
        .where(Receipt.id == receipt_id)
    ).first()

    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found.")
    return _build_receipt_read(rec)


@router.post("/{receipt_id}/validate", response_model=ReceiptRead)
def validate_receipt(receipt_id: int, db: DbSession, current_user: CurrentUser) -> ReceiptRead:
    rec = db.scalars(
        select(Receipt)
        .options(
            selectinload(Receipt.destination_location).selectinload(Location.warehouse),
            selectinload(Receipt.items).selectinload(ReceiptItem.product),
        )
        .where(Receipt.id == receipt_id)
    ).first()

    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found.")

    if rec.status == ReceiptStatus.DONE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Receipt has already been validated and processed.",
        )

    if rec.status == ReceiptStatus.CANCELED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Canceled receipt cannot be validated.",
        )

    # Atomic DB Transaction for updating stock quants + creating ledger entries
    now = datetime.now(timezone.utc)

    for item in rec.items:
        # Fetch or create StockQuant
        quant = db.scalars(
            select(StockQuant).where(
                StockQuant.product_id == item.product_id,
                StockQuant.location_id == rec.destination_location_id,
            )
        ).first()

        if quant:
            quant.quantity += item.quantity
        else:
            quant = StockQuant(
                product_id=item.product_id,
                location_id=rec.destination_location_id,
                quantity=item.quantity,
            )
            db.add(quant)

        # Create Stock Ledger audit record
        ledger = StockLedger(
            reference_number=rec.reference_number,
            movement_type="RECEIPT",
            product_id=item.product_id,
            source_location_id=None,  # Vendor/Supplier source
            destination_location_id=rec.destination_location_id,
            quantity=item.quantity,
            notes=f"Goods received from {rec.supplier_name}",
            user_id=current_user.id,
        )
        db.add(ledger)

    rec.status = ReceiptStatus.DONE
    rec.received_at = now

    db.commit()
    db.refresh(rec)

    return _build_receipt_read(rec)
