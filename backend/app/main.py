"""StockSense FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.seed import seed_data_if_empty
from app.db.session import IS_SQLITE, SessionLocal, engine
import app.models  # noqa: F401

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

logger = logging.getLogger("stocksense.startup")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if IS_SQLITE:
        Base.metadata.create_all(bind=engine)
        logger.warning("Running on SQLite; tables created directly (Alembic bypassed).")
    else:
        logger.info("Running on %s; schema managed by Alembic.", engine.url.get_backend_name())

    db = SessionLocal()
    try:
        seed_data_if_empty(db)
    except Exception as exc:
        logger.warning("Seed check skipped: %s", exc)
    finally:
        db.close()
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
