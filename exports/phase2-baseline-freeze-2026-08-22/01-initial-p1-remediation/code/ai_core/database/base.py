from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from buzzard_ai_complete.config import settings

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None
_engine_url: str | None = None


class Base(DeclarativeBase):
    pass


def _sqlite_on_connect(dbapi_connection, _connection_record):
  cursor = dbapi_connection.cursor()
  cursor.execute("PRAGMA foreign_keys=ON")
  cursor.close()


def get_engine() -> Engine:
    global _engine, _engine_url
    database_url = settings.DATABASE_URL
    if _engine is None or _engine_url != database_url:
        if _engine is not None:
            _engine.dispose()
        connect_args = {}
        if database_url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        _engine = create_engine(
            database_url,
            connect_args=connect_args,
            pool_pre_ping=not database_url.startswith("sqlite"),
            future=True,
        )
        if database_url.startswith("sqlite"):
            event.listen(_engine, "connect", _sqlite_on_connect)
        _engine_url = database_url
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            bind=get_engine(),
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )
    return _SessionLocal


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_ai_core_db() -> None:
    """Create AI Core tables if they do not exist (dev/test bootstrap)."""
    from buzzard_ai_complete.ai_core import models  # noqa: F401

    Base.metadata.create_all(bind=get_engine())


def dispose_engine() -> None:
    global _engine, _SessionLocal, _engine_url
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None
    _engine_url = None


def reset_engine_for_tests(database_url: str | None = None) -> None:
    """Test helper: point engine at isolated database."""
    global _engine, _SessionLocal, _engine_url
    dispose_engine()
    if database_url is not None:
        os.environ["DATABASE_URL"] = database_url
        settings.DATABASE_URL = database_url
