"""DeliveryOrder Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.delivery import DeliveryStatus


class DeliveryItemCreate(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)


class DeliveryItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    delivery_order_id: int
    product_id: int
    quantity: float
    product_name: str | None = None
    product_sku: str | None = None
    product_uom: str | None = None


class DeliveryOrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=150)
    source_location_id: int
    notes: str | None = Field(default=None, max_length=255)
    items: list[DeliveryItemCreate] = Field(..., min_length=1)


class DeliveryOrderUpdate(BaseModel):
    customer_name: str | None = Field(default=None, min_length=2, max_length=150)
    source_location_id: int | None = None
    notes: str | None = Field(default=None, max_length=255)
    status: DeliveryStatus | None = None
    items: list[DeliveryItemCreate] | None = None


class DeliveryOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference_number: str
    customer_name: str
    source_location_id: int
    source_location_name: str | None = None
    warehouse_name: str | None = None
    status: DeliveryStatus
    notes: str | None = None
    delivered_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    items: list[DeliveryItemRead] = []
