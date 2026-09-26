"""Tests for Categories API routes."""

from fastapi import status


def test_create_category(client, auth_headers):
    payload = {"name": "Electronics", "description": "Gadgets and hardware"}
    response = client.post("/api/v1/categories", json=payload, headers=auth_headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Electronics"
    assert data["description"] == "Gadgets and hardware"
    assert data["is_active"] is True
    assert data["product_count"] == 0


def test_create_category_duplicate_name(client, auth_headers):
    payload = {"name": "Electronics"}
    response1 = client.post("/api/v1/categories", json=payload, headers=auth_headers)
    assert response1.status_code == status.HTTP_201_CREATED

    # Case-insensitive duplicate test
    payload_dup = {"name": "electronics"}
    response2 = client.post("/api/v1/categories", json=payload_dup, headers=auth_headers)
    assert response2.status_code == status.HTTP_409_CONFLICT
    assert "already exists" in response2.json()["detail"]


def test_list_categories(client, auth_headers):
    client.post("/api/v1/categories", json={"name": "Apparel"}, headers=auth_headers)
    client.post("/api/v1/categories", json={"name": "Books"}, headers=auth_headers)

    response = client.get("/api/v1/categories", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    items = response.json()
    assert len(items) == 2
    names = [cat["name"] for cat in items]
    assert "Apparel" in names
    assert "Books" in names


def test_update_category(client, auth_headers):
    res = client.post("/api/v1/categories", json={"name": "Old Name"}, headers=auth_headers)
    cat_id = res.json()["id"]

    update_payload = {"name": "New Name", "description": "Updated desc"}
    response = client.patch(f"/api/v1/categories/{cat_id}", json=update_payload, headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["name"] == "New Name"
    assert response.json()["description"] == "Updated desc"


def test_delete_category(client, auth_headers):
    res = client.post("/api/v1/categories", json={"name": "Temporary"}, headers=auth_headers)
    cat_id = res.json()["id"]

    del_res = client.delete(f"/api/v1/categories/{cat_id}", headers=auth_headers)
    assert del_res.status_code == status.HTTP_200_OK
    assert del_res.json()["message"] == "Category deleted."

    # Listing should now be empty
    list_res = client.get("/api/v1/categories", headers=auth_headers)
    assert len(list_res.json()) == 0
