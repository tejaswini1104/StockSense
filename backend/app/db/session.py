"""Database engine and session management."""

from collections.abc import Iterator
import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

logger = logging.getLogger("stocksense.db")

_db_url = settings.DATABASE_URL
_is_sqlite = _db_url.startswith("sqlite")

try:
    engine = create_engine(
        _db_url,
        pool_pre_ping=True,
        connect_args={"check_same_thread": False} if _is_sqlite else {},
        echo=False,
    )
    if not _is_sqlite:
        with engine.connect() as conn:
            pass
except Exception as exc:
    logger.warning("Could not connect to database %s (%s). Falling back to SQLite.", _db_url, exc)
    _db_url = "sqlite:///./stocksense.db"
    _is_sqlite = True
    engine = create_engine(
        _db_url,
        connect_args={"check_same_thread": False},
        echo=False,
    )

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)


def get_db() -> Iterator[Session]:
    """FastAPI dependency that yields a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

