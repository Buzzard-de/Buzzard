from __future__ import annotations

from typing import Any

import jwt

from buzzard_ai_complete.config import settings


class JwtAuthError(Exception):
    pass


def _verification_key() -> str | bytes:
    if settings.BUZZARD_JWT_ALGORITHM.startswith("HS"):
        secret = settings.BUZZARD_JWT_HS_SECRET
        if not secret:
            raise JwtAuthError("BUZZARD_JWT_HS_SECRET not configured")
        return secret
    public_key = settings.BUZZARD_JWT_PUBLIC_KEY
    if not public_key:
        raise JwtAuthError("BUZZARD_JWT_PUBLIC_KEY not configured")
    return public_key


def decode_jwt(token: str) -> dict[str, Any]:
    options = {"require": ["exp", "iat", "sub"]}
    return jwt.decode(
        token,
        _verification_key(),
        algorithms=[settings.BUZZARD_JWT_ALGORITHM],
        audience=settings.BUZZARD_JWT_AUDIENCE,
        issuer=settings.BUZZARD_JWT_ISSUER,
        options=options,
    )


def encode_jwt(
    *,
    subject: str,
    roles: list[str],
    categories: list[str] | None = None,
    expires_in_seconds: int = 3600,
) -> str:
    import time

    if settings.BUZZARD_JWT_ALGORITHM.startswith("HS"):
        key = settings.BUZZARD_JWT_HS_SECRET
        if not key:
            raise JwtAuthError("BUZZARD_JWT_HS_SECRET not configured for signing")
    else:
        key = settings.BUZZARD_JWT_PRIVATE_KEY
        if not key:
            raise JwtAuthError("BUZZARD_JWT_PRIVATE_KEY not configured for signing")
    now = int(time.time())
    payload: dict[str, Any] = {
        "sub": subject,
        "roles": roles,
        "iat": now,
        "exp": now + expires_in_seconds,
        "iss": settings.BUZZARD_JWT_ISSUER,
        "aud": settings.BUZZARD_JWT_AUDIENCE,
    }
    if categories:
        payload["categories"] = categories
    return jwt.encode(payload, key, algorithm=settings.BUZZARD_JWT_ALGORITHM)


def roles_from_claims(claims: dict[str, Any]) -> list[str]:
    roles = claims.get("roles") or []
    if isinstance(roles, str):
        return [roles.strip().lower()]
    return [str(r).strip().lower() for r in roles if str(r).strip()]
