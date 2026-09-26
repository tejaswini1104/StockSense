"""Dashboard statistics routes."""

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession
from app.models.location import Location
from app.models.product import Product, ProductLocationStock
from app.models.receipt import Receipt, ReceiptStatus
from app.models.stock_quant import StockQuant
from app.models.warehouse import Warehouse

try:
    from app.models.delivery import DeliveryOrder, DeliveryStatus
except ImportError:
    DeliveryOrder = None
    DeliveryStatus = None

try:
    from app.models.internal_transfer import InternalTransfer, TransferStatus
except ImportError:
    InternalTransfer = None
    TransferStatus = None

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardStats(BaseModel):
    total_products: int
    low_stock_count: int
    out_of_stock_count: int
    pending_receipts_count: int
    pending_deliveries_count: int
    scheduled_transfers_count: int
    total_warehouses: int
    total_locations: int
    total_stock_units: float


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: DbSession, current_user: CurrentUser) -> DashboardStats:
    total_products = db.scalar(select(func.count(Product.id))) or 0
    total_warehouses = db.scalar(select(func.count(Warehouse.id))) or 0
    total_locations = db.scalar(select(func.count(Location.id))) or 0

    pending_receipts = (
        db.scalar(select(func.count(Receipt.id)).where(Receipt.status == ReceiptStatus.DRAFT)) or 0
    )

    pending_deliveries = 0
    if DeliveryOrder is not None and DeliveryStatus is not None:
        pending_deliveries = (
            db.scalar(
                select(func.count(DeliveryOrder.id)).where(
                    DeliveryOrder.status.in_([DeliveryStatus.DRAFT, DeliveryStatus.PICKED, DeliveryStatus.PACKED])
                )
            )
            or 0
        )

    scheduled_transfers = 0
    if InternalTransfer is not None and TransferStatus is not None:
        scheduled_transfers = (
            db.scalar(
                select(func.count(InternalTransfer.id)).where(
                    InternalTransfer.status == TransferStatus.DRAFT
                )
            )
            or 0
        )

    sq_sum = db.scalar(select(func.sum(StockQuant.quantity)))
    pls_sum = db.scalar(select(func.sum(ProductLocationStock.quantity)))
    total_stock_units = float(sq_sum if sq_sum is not None else (pls_sum if pls_sum is not None else 0.0))

    products = db.scalars(select(Product)).all()
    low_stock = 0
    out_of_stock = 0
    for p in products:
        p_sq = db.scalar(select(func.sum(StockQuant.quantity)).where(StockQuant.product_id == p.id))
        p_pls = db.scalar(select(func.sum(ProductLocationStock.quantity)).where(ProductLocationStock.product_id == p.id))
        p_stock = float(p_sq if p_sq is not None else (p_pls if p_pls is not None else 0.0))
        
        reorder_lvl = float(getattr(p, "reorder_level", 0) or getattr(p, "min_reorder_qty", 0) or 0)
        
        if p_stock <= 0:
            out_of_stock += 1
        if reorder_lvl > 0 and p_stock <= reorder_lvl:
            low_stock += 1

    return DashboardStats(
        total_products=total_products,
        low_stock_count=low_stock,
        out_of_stock_count=out_of_stock,
        pending_receipts_count=pending_receipts,
        pending_deliveries_count=pending_deliveries,
        scheduled_transfers_count=scheduled_transfers,
        total_warehouses=total_warehouses,
        total_locations=total_locations,
        total_stock_units=total_stock_units,
    )
