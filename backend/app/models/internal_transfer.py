"""InternalTransfer and InternalTransferItem models."""

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


class TransferStatus(str, enum.Enum):
    DRAFT = "draft"
    DONE = "done"
    CANCELED = "canceled"


class InternalTransfer(Base, TimestampMixin):
    __tablename__ = "internal_transfers"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    source_location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    destination_location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[TransferStatus] = mapped_column(
        Enum(TransferStatus, name="transfer_status", native_enum=False, length=20),
        default=TransferStatus.DRAFT,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    source_location: Mapped["Location"] = relationship(foreign_keys=[source_location_id])
    destination_location: Mapped["Location"] = relationship(foreign_keys=[destination_location_id])
    created_by_user: Mapped["User | None"] = relationship()
    items: Mapped[list["InternalTransferItem"]] = relationship(back_populates="transfer", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<InternalTransfer ref={self.reference_number!r} status={self.status.value}>"


class InternalTransferItem(Base, TimestampMixin):
    __tablename__ = "internal_transfer_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    transfer_id: Mapped[int] = mapped_column(ForeignKey("internal_transfers.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)

    transfer: Mapped["InternalTransfer"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()

    def __repr__(self) -> str:
        return f"<InternalTransferItem transfer_id={self.transfer_id} product_id={self.product_id} qty={self.quantity}>"
