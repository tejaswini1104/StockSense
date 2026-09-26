"""ORM models. Imported here so Alembic & Base autogenerate discover every table."""

from app.models.category import Category
from app.models.location import Location, LocationType
from app.models.otp import PasswordResetOTP
from app.models.product import Product
from app.models.receipt import Receipt, ReceiptItem, ReceiptStatus
from app.models.stock_ledger import StockLedger
from app.models.stock_quant import StockQuant
from app.models.user import User, UserRole
from app.models.warehouse import Warehouse

__all__ = [
    "Category",
    "Location",
    "LocationType",
    "PasswordResetOTP",
    "Product",
    "Receipt",
    "ReceiptItem",
    "ReceiptStatus",
    "StockLedger",
    "StockQuant",
    "User",
    "UserRole",
    "Warehouse",
]
