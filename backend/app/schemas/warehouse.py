"""Warehouse & Location Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.location import LocationType


class LocationBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=120)
    location_type: LocationType = LocationType.INTERNAL


class LocationCreate(LocationBase):
    warehouse_id: int | None = None


class LocationRead(LocationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    warehouse_id: int
    warehouse_name: str | None = None
    created_at: datetime
    updated_at: datetime


class WarehouseBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=30)
    name: str = Field(..., min_length=2, max_length=120)
    address: str | None = Field(default=None, max_length=255)


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=30)
    name: str | None = Field(default=None, min_length=2, max_length=120)
    address: str | None = Field(default=None, max_length=255)


class WarehouseRead(WarehouseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    locations: list[LocationRead] = []
    total_locations_count: int = 0
    total_products_count: int = 0
