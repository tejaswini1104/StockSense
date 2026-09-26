"""Aggregated API router."""

from fastapi import APIRouter

from app.api.routes import (
    auth,
    categories,
    dashboard,
    deliveries,
    internal_transfers,
    products,
    receipts,
    stock_ledger,
    users,
    warehouses,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(categories.router)
api_router.include_router(products.router)
api_router.include_router(warehouses.router)
api_router.include_router(receipts.router)
api_router.include_router(deliveries.router)
api_router.include_router(internal_transfers.router)
api_router.include_router(stock_ledger.router)
api_router.include_router(dashboard.router)
