"""Warehouses and the locations inside them.

Stock is always held at a Location, never at a Warehouse directly, so that
    Product -> Warehouse -> Location -> Quantity
is answerable.
"""

from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Warehouse(Base, TimestampMixin):
    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    address: Mapped[str | None] = mapped_column(Text, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    locations: Mapped[list["Location"]] = relationship(
        back_populates="warehouse",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<Warehouse id={self.id} code={self.code!r}>"


class Location(Base, TimestampMixin):
    __tablename__ = "locations"
    __table_args__ = (
        UniqueConstraint("warehouse_id", "code", name="uq_location_warehouse_code"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    warehouse: Mapped["Warehouse"] = relationship(back_populates="locations")
    stock_entries: Mapped[list["ProductLocationStock"]] = relationship(  # noqa: F821
        back_populates="location",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    stock_quants: Mapped[list["StockQuant"]] = relationship(  # noqa: F821
        "StockQuant",
        back_populates="location",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def full_name(self) -> str:
        return f"{self.warehouse.name} / {self.name}"

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<Location id={self.id} code={self.code!r}>"
