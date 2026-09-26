"""Category, warehouse/location, product and stock schemas."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.product import UnitOfMeasure

# --------------------------------------------------------------------------- #
# Category
# --------------------------------------------------------------------------- #


class CategoryBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Category name must be at least 2 characters.")
        return cleaned


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


class CategoryRead(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    product_count: int = 0
    created_at: datetime


# --------------------------------------------------------------------------- #
# Warehouse / Location
# --------------------------------------------------------------------------- #


class LocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    warehouse_id: int
    name: str
    code: str
    is_active: bool


class WarehouseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    address: str | None = None
    is_active: bool
    locations: list[LocationRead] = []


# --------------------------------------------------------------------------- #
# Stock
# --------------------------------------------------------------------------- #


class StockByLocation(BaseModel):
    """One product's quantity at one location, flattened for the UI."""

    location_id: int
    location_name: str
    location_code: str
    warehouse_id: int
    warehouse_name: str
    quantity: Decimal


# --------------------------------------------------------------------------- #
# Product
# --------------------------------------------------------------------------- #


def clean_product_name(value: str) -> str:
    cleaned = value.strip()
    if len(cleaned) < 2:
        raise ValueError("Product name must be at least 2 characters.")
    return cleaned


def clean_sku(value: str) -> str:
    """SKUs are compared case-insensitively, so normalise to upper case."""
    cleaned = value.strip().upper()
    if len(cleaned) < 2:
        raise ValueError("SKU must be at least 2 characters.")
    if any(char.isspace() for char in cleaned):
        raise ValueError("SKU cannot contain spaces.")
    return cleaned


class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    sku: str = Field(min_length=2, max_length=64)
    description: str | None = Field(default=None, max_length=2000)
    category_id: int | None = None
    unit_of_measure: UnitOfMeasure = UnitOfMeasure.UNIT
    reorder_level: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=3)

    _clean_name = field_validator("name")(clean_product_name)
    _clean_sku = field_validator("sku")(clean_sku)


class ProductCreate(ProductBase):
    """Create a product, optionally seeding stock at one location."""

    initial_stock: Decimal = Field(
        default=Decimal("0"), ge=0, max_digits=14, decimal_places=3
    )
    initial_location_id: int | None = None


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    sku: str | None = Field(default=None, min_length=2, max_length=64)
    description: str | None = Field(default=None, max_length=2000)
    category_id: int | None = None
    unit_of_measure: UnitOfMeasure | None = None
    reorder_level: Decimal | None = Field(
        default=None, ge=0, max_digits=14, decimal_places=3
    )
    is_active: bool | None = None

    _clean_name = field_validator("name")(clean_product_name)
    _clean_sku = field_validator("sku")(clean_sku)


class CategorySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ProductRead(BaseModel):
    """List-row shape: product plus its rolled-up stock figures."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    description: str | None = None
    unit_of_measure: UnitOfMeasure
    reorder_level: Decimal
    is_active: bool
    created_at: datetime
    category: CategorySummary | None = None
    total_stock: Decimal = Decimal("0")
    stock_status: str = "in_stock"  # in_stock | low_stock | out_of_stock


class ProductDetail(ProductRead):
    """Detail shape: adds the per-location breakdown."""

    stock_by_location: list[StockByLocation] = []


class ProductListResponse(BaseModel):
    items: list[ProductRead]
    total: int
    page: int
    page_size: int
    pages: int
