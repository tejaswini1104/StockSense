"""Dashboard statistics routes."""

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func, select

from app.core.deps import CurrentUser, DbSession
from app.models.location import Location
from app.models.product import Product
from app.models.receipt import Receipt, ReceiptStatus
from app.models.stock_quant import StockQuant
from app.models.warehouse import Warehouse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardStats(BaseModel):
    total_products: int
    low_stock_count: int
    pending_receipts_count: int
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

    total_stock_units = db.scalar(select(func.sum(StockQuant.quantity))) or 0.0

    # Low stock calculation
    products = db.scalars(select(Product)).all()
    low_stock = 0
    for p in products:
        p_stock = db.scalar(select(func.sum(StockQuant.quantity)).where(StockQuant.product_id == p.id)) or 0.0
        if p_stock <= p.min_reorder_qty:
            low_stock += 1

    return DashboardStats(
        total_products=total_products,
        low_stock_count=low_stock,
        pending_receipts_count=pending_receipts,
        total_warehouses=total_warehouses,
        total_locations=total_locations,
        total_stock_units=total_stock_units,
    )
