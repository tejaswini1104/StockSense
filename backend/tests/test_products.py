"""Tests for Products API routes."""

from fastapi import status


def test_create_product_without_stock(client, auth_headers):
    # First create a category
    cat_res = client.post(
        "/api/v1/categories", json={"name": "Hardware"}, headers=auth_headers
    )
    cat_id = cat_res.json()["id"]

    payload = {
        "name": "Wireless Mouse",
        "sku": "WM-100",
        "description": "Ergonomic wireless mouse",
        "category_id": cat_id,
        "unit_of_measure": "pcs",
        "reorder_level": 5,
    }
    response = client.post("/api/v1/products", json=payload, headers=auth_headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Wireless Mouse"
    assert data["sku"] == "WM-100"
    assert data["category"]["name"] == "Hardware"
    assert float(data["total_stock"]) == 0
    assert data["stock_status"] == "out_of_stock"


def test_create_product_with_initial_stock(client, auth_headers):
    payload = {
        "name": "Mechanical Keyboard",
        "sku": "KB-200",
        "unit_of_measure": "unit",
        "reorder_level": 10,
        "initial_stock": 50,
    }
    response = client.post("/api/v1/products", json=payload, headers=auth_headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["sku"] == "KB-200"
    assert float(data["total_stock"]) == 50
    assert data["stock_status"] == "in_stock"
    assert len(data["stock_by_location"]) == 1
    assert data["stock_by_location"][0]["location_code"] == "STOCK"


def test_create_product_duplicate_sku(client, auth_headers):
    payload = {"name": "Item A", "sku": "SKU-DUP"}
    client.post("/api/v1/products", json=payload, headers=auth_headers)

    # Case-insensitive duplicate test
    dup_payload = {"name": "Item B", "sku": "sku-dup"}
    response = client.post("/api/v1/products", json=dup_payload, headers=auth_headers)
    assert response.status_code == status.HTTP_409_CONFLICT
    assert "already used" in response.json()["detail"]


def test_list_and_search_products(client, auth_headers):
    client.post("/api/v1/products", json={"name": "Alpha Widget", "sku": "SKU-A"}, headers=auth_headers)
    client.post("/api/v1/products", json={"name": "Beta Gadget", "sku": "SKU-B"}, headers=auth_headers)

    # List all
    res = client.get("/api/v1/products", headers=auth_headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["total"] == 2

    # Search by name
    res_search = client.get("/api/v1/products?search=alpha", headers=auth_headers)
    assert res_search.json()["total"] == 1
    assert res_search.json()["items"][0]["sku"] == "SKU-A"

    # Search by SKU
    res_sku = client.get("/api/v1/products?search=SKU-B", headers=auth_headers)
    assert res_sku.json()["total"] == 1
    assert res_sku.json()["items"][0]["name"] == "Beta Gadget"


def test_update_product(client, auth_headers):
    create_res = client.post("/api/v1/products", json={"name": "Original Name", "sku": "SKU-ORIG"}, headers=auth_headers)
    product_id = create_res.json()["id"]

    update_payload = {"name": "Updated Name", "reorder_level": 15}
    response = client.patch(f"/api/v1/products/{product_id}", json=update_payload, headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["name"] == "Updated Name"
    assert float(response.json()["reorder_level"]) == 15


def test_product_stock_endpoint(client, auth_headers):
    create_res = client.post(
        "/api/v1/products",
        json={"name": "Stock Test Item", "sku": "SKU-STOCK", "initial_stock": 25},
        headers=auth_headers,
    )
    product_id = create_res.json()["id"]

    stock_res = client.get(f"/api/v1/products/{product_id}/stock", headers=auth_headers)
    assert stock_res.status_code == status.HTTP_200_OK
    items = stock_res.json()
    assert len(items) == 1
    assert float(items[0]["quantity"]) == 25
