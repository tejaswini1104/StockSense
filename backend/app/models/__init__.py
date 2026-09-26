"""ORM models. Imported here so Alembic & Base autogenerate discover every table."""

from app.models.category import Category
from app.models.otp import PasswordResetOTP
from app.models.product import Product, ProductLocationStock, UnitOfMeasure
from app.models.user import User, UserRole
from app.models.warehouse import Location, Warehouse

# Optional imports from additional modules if present
try:
    from app.models.location import LocationType  # noqa: F401
except ImportError:
    pass

try:
    from app.models.receipt import Receipt, ReceiptItem, ReceiptStatus  # noqa: F401
except ImportError:
    pass

try:
    from app.models.stock_ledger import StockLedger  # noqa: F401
except ImportError:
    pass

try:
    from app.models.stock_quant import StockQuant  # noqa: F401
except ImportError:
    pass

__all__ = [
    "Category",
    "Location",
    "PasswordResetOTP",
    "Product",
    "ProductLocationStock",
    "UnitOfMeasure",
    "User",
    "UserRole",
    "Warehouse",
]
