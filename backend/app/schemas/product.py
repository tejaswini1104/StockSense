"""Product Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.category import CategoryRead


class StockQuantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    location_id: int
    quantity: float
    location_name: str | None = None
    warehouse_name: str | None = None


class ProductBase(BaseModel):
    sku: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=255)
    category_id: int | None = None
    uom: str = Field(default="Units", max_length=30)
    min_reorder_qty: float = Field(default=10.0, ge=0)
    max_reorder_qty: float = Field(default=100.0, ge=0)


class ProductCreate(ProductBase):
    initial_stock: float | None = Field(default=None, ge=0)
    initial_location_id: int | None = None


class ProductUpdate(BaseModel):
    sku: str | None = Field(default=None, min_length=2, max_length=50)
    name: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=255)
    category_id: int | None = None
    uom: str | None = Field(default=None, max_length=30)
    min_reorder_qty: float | None = Field(default=None, ge=0)
    max_reorder_qty: float | None = Field(default=None, ge=0)


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    total_stock: float = 0.0
    is_low_stock: bool = False
    category: CategoryRead | None = None
    stock_by_location: list[StockQuantRead] = []
