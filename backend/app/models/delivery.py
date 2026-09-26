"""DeliveryOrder and DeliveryItem models (Outgoing stock operations)."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, Enum, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.location import Location
    from app.models.product import Product
    from app.models.user import User


class DeliveryStatus(str, enum.Enum):
    DRAFT = "draft"
    PICKED = "picked"
    PACKED = "packed"
    DONE = "done"
    CANCELED = "canceled"


class DeliveryOrder(Base, TimestampMixin):
    __tablename__ = "delivery_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_name: Mapped[str] = mapped_column(String(150), nullable=False)
    source_location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus, name="delivery_status", native_enum=False, length=20),
        default=DeliveryStatus.DRAFT,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    source_location: Mapped["Location"] = relationship()
    created_by_user: Mapped["User | None"] = relationship()
    items: Mapped[list["DeliveryItem"]] = relationship(back_populates="delivery_order", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<DeliveryOrder ref={self.reference_number!r} status={self.status.value}>"


class DeliveryItem(Base, TimestampMixin):
    __tablename__ = "delivery_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    delivery_order_id: Mapped[int] = mapped_column(ForeignKey("delivery_orders.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)

    delivery_order: Mapped["DeliveryOrder"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()

    def __repr__(self) -> str:
        return f"<DeliveryItem delivery_order_id={self.delivery_order_id} product_id={self.product_id} qty={self.quantity}>"
