"""Location model."""

import enum
from typing import TYPE_CHECKING
from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.warehouse import Warehouse
    from app.models.stock_quant import StockQuant


class LocationType(str, enum.Enum):
    INTERNAL = "internal"
    RECEIVING = "receiving"
    OUTPUT = "output"
    SUPPLIER = "supplier"
    CUSTOMER = "customer"
    ADJUSTMENT = "adjustment"


class Location(Base, TimestampMixin):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    location_type: Mapped[LocationType] = mapped_column(
        Enum(LocationType, name="location_type", native_enum=False, length=20),
        default=LocationType.INTERNAL,
        nullable=False,
    )

    warehouse: Mapped["Warehouse"] = relationship(back_populates="locations")
    stock_quants: Mapped[list["StockQuant"]] = relationship(back_populates="location", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Location id={self.id} code={self.code!r} name={self.name!r}>"
