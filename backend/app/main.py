"""StockSense FastAPI application entrypoint."""

import logging

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Inventory management backend for StockSense.",
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health"], summary="Service metadata")
def root() -> dict[str, str]:
    return {
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"], summary="Health check")
def health() -> dict[str, str]:
    return {"status": "ok"}
