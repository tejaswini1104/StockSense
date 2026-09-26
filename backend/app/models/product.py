"""Product model."""

from typing import TYPE_CHECKING
from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.stock_quant import StockQuant


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    uom: Mapped[str] = mapped_column(String(30), default="Units", nullable=False)  # Unit of Measure
    min_reorder_qty: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    max_reorder_qty: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)

    category: Mapped["Category | None"] = relationship(back_populates="products")
    stock_quants: Mapped[list["StockQuant"]] = relationship(back_populates="product", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Product id={self.id} sku={self.sku!r} name={self.name!r}>"
