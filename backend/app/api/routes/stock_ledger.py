"""Stock Ledger / Move History routes."""

from fastapi import APIRouter, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.location import Location
from app.models.product import Product
from app.models.stock_ledger import StockLedger
from app.schemas.stock_ledger import StockLedgerRead

router = APIRouter(prefix="/stock-ledger", tags=["Stock Ledger"])


@router.get("", response_model=list[StockLedgerRead])
def list_stock_ledger(
    db: DbSession,
    current_user: CurrentUser,
    product_id: int | None = Query(default=None),
) -> list[StockLedgerRead]:
    query = (
        select(StockLedger)
        .options(
            selectinload(StockLedger.product),
            selectinload(StockLedger.source_location),
            selectinload(StockLedger.destination_location),
        )
        .order_by(StockLedger.created_at.desc())
    )

    if product_id is not None:
        query = query.where(StockLedger.product_id == product_id)

    ledger_entries = db.scalars(query).all()

    result = []
    for entry in ledger_entries:
        res = StockLedgerRead.model_validate(entry)
        res.product_name = entry.product.name if entry.product else None
        res.product_sku = entry.product.sku if entry.product else None
        res.source_location_name = entry.source_location.name if entry.source_location else None
        res.destination_location_name = entry.destination_location.name if entry.destination_location else None
        result.append(res)

    return result
