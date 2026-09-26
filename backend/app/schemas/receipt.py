"""Receipt Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.receipt import ReceiptStatus


class ReceiptItemCreate(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)


class ReceiptItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    receipt_id: int
    product_id: int
    quantity: float
    product_name: str | None = None
    product_sku: str | None = None
    product_uom: str | None = None


class ReceiptCreate(BaseModel):
    supplier_name: str = Field(..., min_length=2, max_length=150)
    destination_location_id: int
    notes: str | None = Field(default=None, max_length=255)
    items: list[ReceiptItemCreate] = Field(..., min_length=1)


class ReceiptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference_number: str
    supplier_name: str
    destination_location_id: int
    destination_location_name: str | None = None
    warehouse_name: str | None = None
    status: ReceiptStatus
    notes: str | None = None
    received_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    items: list[ReceiptItemRead] = []
