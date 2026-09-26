"""StockLedger model (complete audit log of all stock movements)."""

from typing import TYPE_CHECKING
from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.location import Location
    from app.models.product import Product
    from app.models.user import User


class StockLedger(Base, TimestampMixin):
    __tablename__ = "stock_ledger"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference_number: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    movement_type: Mapped[str] = mapped_column(String(30), nullable=False)  # RECEIPT, DELIVERY, TRANSFER, ADJUSTMENT
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    source_location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id", ondelete="SET NULL"), nullable=True)
    destination_location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id", ondelete="SET NULL"), nullable=True)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    product: Mapped["Product"] = relationship()
    source_location: Mapped["Location | None"] = relationship(foreign_keys=[source_location_id])
    destination_location: Mapped["Location | None"] = relationship(foreign_keys=[destination_location_id])
    user: Mapped["User | None"] = relationship()

    def __repr__(self) -> str:
        return f"<StockLedger ref={self.reference_number!r} type={self.movement_type} qty={self.quantity}>"
