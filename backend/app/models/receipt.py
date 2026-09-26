"""Receipt and ReceiptItem models."""

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


class ReceiptStatus(str, enum.Enum):
    DRAFT = "draft"
    DONE = "done"
    CANCELED = "canceled"


class Receipt(Base, TimestampMixin):
    __tablename__ = "receipts"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(150), nullable=False)
    destination_location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[ReceiptStatus] = mapped_column(
        Enum(ReceiptStatus, name="receipt_status", native_enum=False, length=20),
        default=ReceiptStatus.DRAFT,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    destination_location: Mapped["Location"] = relationship()
    created_by_user: Mapped["User | None"] = relationship()
    items: Mapped[list["ReceiptItem"]] = relationship(back_populates="receipt", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Receipt ref={self.reference_number!r} status={self.status.value}>"


class ReceiptItem(Base, TimestampMixin):
    __tablename__ = "receipt_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    receipt_id: Mapped[int] = mapped_column(ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)

    receipt: Mapped["Receipt"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()

    def __repr__(self) -> str:
        return f"<ReceiptItem receipt_id={self.receipt_id} product_id={self.product_id} qty={self.quantity}>"
