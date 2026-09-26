"""InternalTransfer Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.internal_transfer import TransferStatus


class InternalTransferItemCreate(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)


class InternalTransferItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transfer_id: int
    product_id: int
    quantity: float
    product_name: str | None = None
    product_sku: str | None = None
    product_uom: str | None = None


class InternalTransferCreate(BaseModel):
    source_location_id: int
    destination_location_id: int
    notes: str | None = Field(default=None, max_length=255)
    items: list[InternalTransferItemCreate] = Field(..., min_length=1)


class InternalTransferRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference_number: str
    source_location_id: int
    source_location_name: str | None = None
    source_warehouse_name: str | None = None
    destination_location_id: int
    destination_location_name: str | None = None
    destination_warehouse_name: str | None = None
    status: TransferStatus
    notes: str | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    items: list[InternalTransferItemRead] = []
