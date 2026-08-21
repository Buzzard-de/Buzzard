from __future__ import annotations

import uuid
from typing import Annotated, Generator

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from buzzard_ai_complete.ai_core.database.base import get_session_factory, init_ai_core_db
from buzzard_ai_complete.ai_core.schemas.api import TaskCreateRequest
from buzzard_ai_complete.ai_core.services.audit_service import AuditService
from buzzard_ai_complete.ai_core.services.exception_service import ExceptionService
from buzzard_ai_complete.ai_core.services.memory_service import CentralMemoryService
from buzzard_ai_complete.ai_core.services.orchestrator import UnifiedOrchestrator
from buzzard_ai_complete.ai_core.security.token_roles import resolve_actor_role
from buzzard_ai_complete.config import settings

_db_initialized = False


def ensure_ai_core_db() -> None:
  global _db_initialized
  if not _db_initialized:
    init_ai_core_db()
    _db_initialized = True


def get_db() -> Generator[Session, None, None]:
  ensure_ai_core_db()
  session = get_session_factory()()
  try:
    yield session
    session.commit()
  except Exception:
    session.rollback()
    raise
  finally:
    session.close()


def get_request_id(
  request: Request,
  x_request_id: Annotated[str | None, Header(alias="X-Request-Id")] = None,
) -> str:
  rid = x_request_id or getattr(request.state, "request_id", None)
  if not rid:
    rid = str(uuid.uuid4())
  request.state.request_id = rid
  return rid


def authorize(
  authorization: Annotated[str | None, Header()] = None,
  x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> str:
  if not settings.API_TOKEN:
    raise HTTPException(
      status_code=503,
      detail={
        "code": "AUTH_NOT_CONFIGURED",
        "message": "BUZZARD_API_TOKEN is not configured; protected endpoints are unavailable",
      },
    )
  token = None
  if authorization and authorization.lower().startswith("bearer "):
    token = authorization[7:].strip()
  elif authorization:
    token = authorization.strip()
  elif x_api_key:
    token = x_api_key.strip()
  if not token:
    raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Unauthorized"})
  valid_tokens = {settings.API_TOKEN, *settings.API_TOKEN_ROLES.keys()}
  valid_tokens.discard("")
  if token not in valid_tokens:
    raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Unauthorized"})
  return token


def get_actor_role(
  token: Annotated[str, Depends(authorize)],
  x_actor_role: Annotated[str | None, Header(alias="X-Actor-Role")] = None,
) -> str:
  return resolve_actor_role(token, x_actor_role)


def get_idempotency_key(
  body: TaskCreateRequest,
  idempotency_key_header: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> str | None:
  header_key = idempotency_key_header.strip() if idempotency_key_header else None
  body_key = body.idempotency_key.strip() if body.idempotency_key else None
  if header_key and body_key and header_key != body_key:
    raise HTTPException(
      status_code=400,
      detail={
        "code": "VALIDATION_ERROR",
        "message": "Idempotency-Key header conflicts with body idempotency_key",
      },
    )
  return header_key or body_key


def get_actor(
  token: Annotated[str, Depends(authorize)],
  actor_role: Annotated[str, Depends(get_actor_role)],
) -> str:
  return f"api:{actor_role}"


def get_audit_service(
  db: Annotated[Session, Depends(get_db)],
  request_id: Annotated[str, Depends(get_request_id)],
) -> AuditService:
  return AuditService(db)


def get_memory_service(
  db: Annotated[Session, Depends(get_db)],
  audit: Annotated[AuditService, Depends(get_audit_service)],
  request_id: Annotated[str, Depends(get_request_id)],
) -> CentralMemoryService:
  return CentralMemoryService(db, audit, request_id)


def get_exception_service(
  db: Annotated[Session, Depends(get_db)],
  audit: Annotated[AuditService, Depends(get_audit_service)],
  request_id: Annotated[str, Depends(get_request_id)],
) -> ExceptionService:
  return ExceptionService(db, audit, request_id)


def get_orchestrator(
  db: Annotated[Session, Depends(get_db)],
  audit: Annotated[AuditService, Depends(get_audit_service)],
  memory: Annotated[CentralMemoryService, Depends(get_memory_service)],
  exceptions: Annotated[ExceptionService, Depends(get_exception_service)],
  request_id: Annotated[str, Depends(get_request_id)],
  actor: Annotated[str, Depends(get_actor)],
) -> UnifiedOrchestrator:
  return UnifiedOrchestrator(db, audit, memory, exceptions, request_id)
