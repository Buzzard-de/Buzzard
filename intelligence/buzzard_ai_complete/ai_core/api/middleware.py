from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from buzzard_ai_complete.ai_core.security.rate_limiter import RateLimiter


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Attach X-Request-Id to every /api/v1 response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if not request.url.path.startswith("/api/v1"):
            return await call_next(request)
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Enforce per-actor API rate limits with HTTP 429 responses."""

    def __init__(self, app, limiter: RateLimiter | None = None) -> None:
        super().__init__(app)
        self._limiter = limiter or RateLimiter()

    def _actor_key(self, request: Request) -> str:
        authorization = request.headers.get("Authorization", "")
        if authorization.lower().startswith("bearer "):
            return authorization[7:].strip()[:128] or "anonymous"
        if request.client and request.client.host:
            return request.client.host
        return "anonymous"

    async def dispatch(self, request: Request, call_next) -> Response:
        if not request.url.path.startswith("/api/v1"):
            return await call_next(request)
        if request.url.path.rstrip("/").endswith("/health") or request.url.path.rstrip("/").endswith("/health/ready"):
            return await call_next(request)
        actor = self._actor_key(request)
        if not self._limiter.allow(actor):
            request_id = getattr(request.state, "request_id", None) or str(uuid.uuid4())
            return JSONResponse(
                status_code=429,
                content={
                    "code": "RATE_LIMITED",
                    "message": "Too many requests",
                    "request_id": request_id,
                },
                headers={"X-Request-Id": request_id},
            )
        return await call_next(request)
