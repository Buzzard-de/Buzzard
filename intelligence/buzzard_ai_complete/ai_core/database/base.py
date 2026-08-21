from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from buzzard_ai_complete.config.settings import DATABASE_URL

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


class Base(DeclarativeBase):
    pass


def _sqlite_on_connect(dbapi_connection, _connection_record):
  if DATABASE_URL.startswith("sqlite"):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        connect_args = {}
        if DATABASE_URL.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        _engine = create_engine(
            DATABASE_URL,
            connect_args=connect_args,
            pool_pre_ping=not DATABASE_URL.startswith("sqlite"),
            future=True,
        )
        if DATABASE_URL.startswith("sqlite"):
            event.listen(_engine, "connect", _sqlite_on_connect)
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
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None


def reset_engine_for_tests(database_url: str | None = None) -> None:
    """Test helper: point engine at isolated database."""
    global _engine, _SessionLocal
    dispose_engine()
    if database_url is not None:
        os.environ["DATABASE_URL"] = database_url
