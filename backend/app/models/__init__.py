"""ORM models. Imported here so Alembic & Base autogenerate discover every table."""

from app.models.category import Category
from app.models.internal_transfer import InternalTransfer, InternalTransferItem, TransferStatus
from app.models.location import Location, LocationType
from app.models.otp import PasswordResetOTP
from app.models.product import Product
from app.models.receipt import Receipt, ReceiptItem, ReceiptStatus
from app.models.stock_ledger import StockLedger
from app.models.stock_quant import StockQuant
from app.models.user import User, UserRole
from app.models.warehouse import Warehouse

try:
    from app.models.product import ProductLocationStock, UnitOfMeasure  # noqa: F401
except ImportError:
    pass

try:
    from app.models.delivery import DeliveryItem, DeliveryOrder, DeliveryStatus  # noqa: F401
except ImportError:
    pass

__all__ = [
    "Category",
    "DeliveryItem",
    "DeliveryOrder",
    "DeliveryStatus",
    "InternalTransfer",
    "InternalTransferItem",
    "Location",
    "LocationType",
    "PasswordResetOTP",
    "Product",
    "Receipt",
    "ReceiptItem",
    "ReceiptStatus",
    "StockLedger",
    "StockQuant",
    "TransferStatus",
    "User",
    "UserRole",
    "Warehouse",
]
