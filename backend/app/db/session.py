"""Database engine and session management."""

import logging
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

logger = logging.getLogger("stocksense.db")

SQLITE_FALLBACK_URL = "sqlite:///./stocksense.db"


def _build_engine():
    """Create the engine, optionally falling back to SQLite.

    The fallback is opt-in (``ALLOW_SQLITE_FALLBACK``, off by default). Falling
    back silently is dangerous: stock written to a local SQLite file is
    invisible in PostgreSQL, so inventory would appear to vanish. With the flag
    off we fail loudly instead, which is the right behaviour for a system whose
    whole job is a single consistent stock state.
    """
    url = settings.DATABASE_URL
    is_sqlite = url.startswith("sqlite")

    engine = create_engine(
        url,
        pool_pre_ping=True,
        connect_args={"check_same_thread": False} if is_sqlite else {},
        echo=False,
    )

    if is_sqlite:
        return engine, True

    try:
        with engine.connect():
            pass
        return engine, False
    except Exception as exc:
        if not settings.ALLOW_SQLITE_FALLBACK:
            logger.error("Cannot connect to the database at %s: %s", url, exc)
            raise
        logger.warning(
            "Cannot connect to %s (%s). ALLOW_SQLITE_FALLBACK is on, so using %s "
            "- data written here will NOT be in PostgreSQL.",
            url,
            exc,
            SQLITE_FALLBACK_URL,
        )
        return (
            create_engine(
                SQLITE_FALLBACK_URL,
                connect_args={"check_same_thread": False},
                echo=False,
            ),
            True,
        )


engine, IS_SQLITE = _build_engine()

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)


def get_db() -> Iterator[Session]:
    """FastAPI dependency that yields a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
