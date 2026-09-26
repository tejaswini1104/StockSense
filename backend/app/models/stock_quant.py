"""StockQuant model (tracks real-time stock per product & location)."""

from typing import TYPE_CHECKING
from sqlalchemy import Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.location import Location


class StockQuant(Base, TimestampMixin):
    __tablename__ = "stock_quants"
    __table_args__ = (
        UniqueConstraint("product_id", "location_id", name="uq_product_location"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    product: Mapped["Product"] = relationship(back_populates="stock_quants")
    location: Mapped["Location"] = relationship(back_populates="stock_quants")

    def __repr__(self) -> str:
        return f"<StockQuant product_id={self.product_id} location_id={self.location_id} qty={self.quantity}>"
