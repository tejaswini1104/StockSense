"""Unit tests for Delivery Orders (Outgoing stock operations)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.delivery import DeliveryOrder, DeliveryStatus
from app.models.product import Product, ProductLocationStock, UnitOfMeasure
from app.models.stock_ledger import StockLedger
from app.models.stock_quant import StockQuant
from app.models.warehouse import Location, Warehouse


@pytest.fixture
def sample_location(db_session: Session) -> Location:
    wh = Warehouse(name="Main Warehouse", code="WH-MAIN")
    db_session.add(wh)
    db_session.flush()
    loc = Location(warehouse_id=wh.id, name="Main Storage", code="WH-MAIN-STOCK")
    db_session.add(loc)
    db_session.commit()
    db_session.refresh(loc)
    return loc


@pytest.fixture
def sample_product(db_session: Session) -> Product:
    prod = Product(
        name="Industrial Widget",
        sku="WIDGET-001",
        unit_of_measure=UnitOfMeasure.PCS,
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)
    return prod


def test_create_delivery_order(
    client: TestClient, auth_headers: dict[str, str], sample_location: Location, sample_product: Product
):
    payload = {
        "customer_name": "Acme Industries",
        "source_location_id": sample_location.id,
        "notes": "Urgent order",
        "items": [
            {"product_id": sample_product.id, "quantity": 10.0}
        ],
    }
    res = client.post("/api/v1/deliveries", json=payload, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["customer_name"] == "Acme Industries"
    assert data["status"] == "draft"
    assert data["reference_number"].startswith("DEL-2026-")
    assert len(data["items"]) == 1
    assert data["items"][0]["quantity"] == 10.0
    assert data["items"][0]["product_name"] == "Industrial Widget"


def test_delivery_workflow_pick_pack(
    client: TestClient, auth_headers: dict[str, str], sample_location: Location, sample_product: Product
):
    # Create delivery order
    payload = {
        "customer_name": "Beta Corp",
        "source_location_id": sample_location.id,
        "items": [{"product_id": sample_product.id, "quantity": 5.0}],
    }
    create_res = client.post("/api/v1/deliveries", json=payload, headers=auth_headers)
    delivery_id = create_res.json()["id"]

    # Pick delivery
    pick_res = client.post(f"/api/v1/deliveries/{delivery_id}/pick", headers=auth_headers)
    assert pick_res.status_code == 200
    assert pick_res.json()["status"] == "picked"

    # Pack delivery
    pack_res = client.post(f"/api/v1/deliveries/{delivery_id}/pack", headers=auth_headers)
    assert pack_res.status_code == 200
    assert pack_res.json()["status"] == "packed"


def test_validate_delivery_insufficient_stock(
    client: TestClient, auth_headers: dict[str, str], sample_location: Location, sample_product: Product
):
    # Create delivery for 50 units (stock is currently 0)
    payload = {
        "customer_name": "Gamma Corp",
        "source_location_id": sample_location.id,
        "items": [{"product_id": sample_product.id, "quantity": 50.0}],
    }
    create_res = client.post("/api/v1/deliveries", json=payload, headers=auth_headers)
    delivery_id = create_res.json()["id"]

    # Attempt to validate stock without sufficient quantity
    val_res = client.post(f"/api/v1/deliveries/{delivery_id}/validate", headers=auth_headers)
    assert val_res.status_code == 400
    assert "Insufficient stock" in val_res.json()["detail"]


def test_validate_delivery_success_stock_deduction(
    client: TestClient,
    auth_headers: dict[str, str],
    db_session: Session,
    sample_location: Location,
    sample_product: Product,
):
    # Add initial stock of 100 units to sample_location
    sq = StockQuant(product_id=sample_product.id, location_id=sample_location.id, quantity=100.0)
    pls = ProductLocationStock(product_id=sample_product.id, location_id=sample_location.id, quantity=100.0)
    db_session.add(sq)
    db_session.add(pls)
    db_session.commit()

    # Create delivery order for 30 units
    payload = {
        "customer_name": "Delta Logistics",
        "source_location_id": sample_location.id,
        "items": [{"product_id": sample_product.id, "quantity": 30.0}],
    }
    create_res = client.post("/api/v1/deliveries", json=payload, headers=auth_headers)
    delivery_id = create_res.json()["id"]

    # Validate delivery
    val_res = client.post(f"/api/v1/deliveries/{delivery_id}/validate", headers=auth_headers)
    assert val_res.status_code == 200
    del_data = val_res.json()
    assert del_data["status"] == "done"
    assert del_data["delivered_at"] is not None

    # Verify database stock updated: 100 - 30 = 70
    db_session.expire_all()
    updated_sq = db_session.query(StockQuant).filter_by(product_id=sample_product.id, location_id=sample_location.id).first()
    assert updated_sq.quantity == 70.0

    updated_pls = db_session.query(ProductLocationStock).filter_by(product_id=sample_product.id, location_id=sample_location.id).first()
    assert float(updated_pls.quantity) == 70.0

    # Verify StockLedger entry recorded
    ledger = db_session.query(StockLedger).filter_by(reference_number=del_data["reference_number"]).first()
    assert ledger is not None
    assert ledger.movement_type == "DELIVERY"
    assert ledger.quantity == 30.0
    assert ledger.source_location_id == sample_location.id


def test_prevent_duplicate_validation(
    client: TestClient,
    auth_headers: dict[str, str],
    db_session: Session,
    sample_location: Location,
    sample_product: Product,
):
    # Add initial stock
    sq = StockQuant(product_id=sample_product.id, location_id=sample_location.id, quantity=50.0)
    db_session.add(sq)
    db_session.commit()

    # Create & validate delivery
    payload = {
        "customer_name": "Epsilon Inc",
        "source_location_id": sample_location.id,
        "items": [{"product_id": sample_product.id, "quantity": 10.0}],
    }
    create_res = client.post("/api/v1/deliveries", json=payload, headers=auth_headers)
    delivery_id = create_res.json()["id"]

    val_res1 = client.post(f"/api/v1/deliveries/{delivery_id}/validate", headers=auth_headers)
    assert val_res1.status_code == 200

    # Second validation attempt must fail
    val_res2 = client.post(f"/api/v1/deliveries/{delivery_id}/validate", headers=auth_headers)
    assert val_res2.status_code == 400
    assert "already been validated" in val_res2.json()["detail"]
