"""LocationType enum and Location reference."""

import enum
from app.models.warehouse import Location

class LocationType(str, enum.Enum):
    INTERNAL = "internal"
    RECEIVING = "receiving"
    OUTPUT = "output"
    SUPPLIER = "supplier"
    CUSTOMER = "customer"
    ADJUSTMENT = "adjustment"

__all__ = ["Location", "LocationType"]
