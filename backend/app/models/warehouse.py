"""Warehouse model."""

from typing import TYPE_CHECKING
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.location import Location


class Warehouse(Base, TimestampMixin):
    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)

    locations: Mapped[list["Location"]] = relationship(back_populates="warehouse", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Warehouse id={self.id} code={self.code!r} name={self.name!r}>"
