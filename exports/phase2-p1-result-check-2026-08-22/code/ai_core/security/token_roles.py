from __future__ import annotations

from buzzard_ai_complete.config import settings


def resolve_actor_role(token: str, header_role: str | None = None) -> str:
    """Resolve actor role from token mapping; header role only when explicitly allowed."""
    mapped = settings.API_TOKEN_ROLES.get(token)
    if mapped:
        return mapped.strip().lower()
    if settings.ALLOW_ROLE_HEADER and header_role and header_role.strip():
        return header_role.strip().lower()
    return settings.DEFAULT_API_ROLE.strip().lower()
