"""StockLedger Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class StockLedgerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference_number: str
    movement_type: str
    product_id: int
    product_name: str | None = None
    product_sku: str | None = None
    source_location_id: int | None = None
    source_location_name: str | None = None
    destination_location_id: int | None = None
    destination_location_name: str | None = None
    quantity: float
    notes: str | None = None
    created_at: datetime
