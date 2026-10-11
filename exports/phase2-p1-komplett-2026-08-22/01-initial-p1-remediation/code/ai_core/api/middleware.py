from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


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
