"""Product and its per-location stock."""

import enum
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class UnitOfMeasure(str, enum.Enum):
    """Units stock can be counted in."""

    UNIT = "unit"
    PCS = "pcs"
    BOX = "box"
    PACK = "pack"
    KG = "kg"
    G = "g"
    L = "l"
    ML = "ml"
    M = "m"


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    # SKU is the business key operators search by, so it is unique and indexed.
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), index=True, default=None
    )
    unit_of_measure: Mapped[UnitOfMeasure] = mapped_column(
        Enum(UnitOfMeasure, name="unit_of_measure", native_enum=False, length=10),
        default=UnitOfMeasure.UNIT,
        nullable=False,
    )
    reorder_level: Mapped[Decimal] = mapped_column(
        Numeric(14, 3), default=Decimal("0"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    category: Mapped["Category | None"] = relationship(  # noqa: F821
        back_populates="products",
    )
    stock_entries: Mapped[list["ProductLocationStock"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    stock_quants: Mapped[list["StockQuant"]] = relationship(  # noqa: F821
        "StockQuant",
        back_populates="product",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint("reorder_level >= 0", name="ck_product_reorder_level_non_negative"),
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<Product id={self.id} sku={self.sku!r}>"


class ProductLocationStock(Base, TimestampMixin):
    """Quantity of one product at one location."""

    __tablename__ = "product_location_stock"
    __table_args__ = (
        UniqueConstraint("product_id", "location_id", name="uq_stock_product_location"),
        CheckConstraint("quantity >= 0", name="ck_stock_quantity_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True, nullable=False
    )
    location_id: Mapped[int] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 3), default=Decimal("0"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product: Mapped["Product"] = relationship(back_populates="stock_entries")
    location: Mapped["Location"] = relationship(back_populates="stock_entries")  # noqa: F821

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return (
            f"<ProductLocationStock product={self.product_id} "
            f"location={self.location_id} qty={self.quantity}>"
        )
